
const driver = global.neo4j_driver;
const uuidv4 = require('uuid').v4;

module.exports.getTicket = (ticket_id) => {
	return new Promise(async (resolve, reject) => {
		const session = driver.session();
		try{
			resolve((await session.run(
				'MATCH (t:Ticket) \n\
				WHERE t.id = $id \n \
				RETURN t', 
			{ id: ticket_id })).records[0].get(0));

		}
		catch(err){
			console.error(err);
			reject(err);
		}
		finally{
			session.close();	
		}
	});
};

module.exports.getTicketList = (ticket_ids) => {
	return new Promise(async (resolve, reject) => {
		let j = 0;
		let out = [];
		const f = async () => {
			if(j < ticket_ids.length){
				await global.redis_client.get(ticket_ids[j],(err, res)=>{		
					if(err) reject(err);	
					res = JSON.parse(res);				
					console.log(res);				
					out.push(res.ticket);
					j++;f();
				});
			}				
			else{
				console.log(out);
				resolve(out);
			}
		};			
		f();
	});
};


module.exports.get = (filter) => {
	return new Promise(async (resolve, reject) => {
		const session = driver.session();
		try{
			console.log(filter);
			const d = (await session.run(
				'MATCH (t:Ticket) \n\
				WHERE exists((:From {city: $from})-[:Tets]->(t)) \n \
				AND exists((:To {city: $to})-[:Tets]->(t)) \n' +
				( filter.date.length>0? 'AND exists((:Date {date: $date})-[:Tets]->(t)) \n' : '') +
				( filter.baggage? 'AND exists((:Baggage {baggage: $baggage})-[:Tets]->(t)) \n' : '') +
				( (filter.S7 || filter.UT || filter.AF || filter.PB || filter.RS)? 'AND ( \n' : '' ) +
				( (filter.S7)? 'exists((:Seller {seller: "S7"})-[:Tets]->(t)) ' : '' ) +
				( (filter.S7 && (filter.UT || filter.AF || filter.PB || filter.RS))? ' OR ' : '' ) +
				( (filter.UT)? 'exists((:Seller {seller: "UT"})-[:Tets]->(t)) ' : '' ) +
				( ((filter.UT) && (filter.AF || filter.PB || filter.RS))? ' OR ' : '' ) +
				( (filter.AF)? 'exists((:Seller {seller: "AF"})-[:Tets]->(t)) ' : '' ) +
				( ((filter.AF) && (filter.PB || filter.RS))? ' OR ' : '' ) +
				( (filter.PB)? 'exists((:Seller {seller: "PB"})-[:Tets]->(t)) ' : '' ) +
				( (filter.RS && (filter.PB))? ' OR ' : '' ) +
				( (filter.RS)? 'exists((:Seller {seller: "RS"})-[:Tets]->(t)) ' : '' ) +
				( (filter.S7 || filter.UT || filter.AF || filter.PB || filter.RS)? ') \n' : '' ) +
				'RETURN t', 
			filter)).records;
			let d1 = [];
			for(var i = 0; i < d.length; i++){
				d1.push(d[i].get(0).properties.id);
			}
			let j = 0;
			let out = [];
			const f = async () => {
				if(j < d1.length){
					await global.redis_client.get(d1[j], (err, res)=>{					
						if(err) { throw err; }	
						out.push({ id: d[j].get(0).properties.id, ticket: JSON.parse(res).ticket});
						j++;f();
					});
				}				
				else{
					console.log(out);
					resolve(out);
				}
			};			
			f();
		}
		catch(err){
			console.error(err);
			reject(err);
		}
		finally{
			session.close();	
		}
	});
};

module.exports.add = async (ticket) => {
	if(ticket.to){
	if(ticket.from){
	if(ticket.date){
	if(ticket.seller){
	if(ticket.baggage){
	if(ticket.transfer){
	if(ticket.price){
		const session = driver.session();
		try{
			await session.run('MERGE (n:From {city: $city}) RETURN n', { city: ticket.from });
			await session.run('MERGE (n:To {city: $city}) RETURN n', { city: ticket.to });
			await session.run('MERGE (n:Date {date: $date}) RETURN n', { date: ticket.date });
			await session.run('MERGE (n:Baggage {baggage: $baggage}) RETURN n', { baggage: ticket.baggage });
			await session.run('MERGE (n:Seller {seller: $seller}) RETURN n', { seller: ticket.seller });
			await session.run('MERGE (n:Transfer {transfer: $transfer}) RETURN n', { transfer: ticket.transfer });

			const ticket_id = uuidv4();
			await session.run('MERGE (n:Ticket {id: $id}) RETURN n', { id: ticket_id });
			
			await session.run(
				'MATCH (a:From), (b:Ticket)\n \
				WHERE a.city = $city AND b.id = $id\n \
				CREATE (a)-[r:Tets]->(b)\n \
				RETURN r', 
			{ city: ticket.from, id: ticket_id, });
			await session.run(
				'MATCH (a:To), (b:Ticket)\n \
				WHERE a.city = $city AND b.id = $id\n \
				CREATE (a)-[r:Tets]->(b)\n \
				RETURN r', 
			{ city: ticket.to, id: ticket_id, });
			await session.run(
				'MATCH (a:Date), (b:Ticket)\n \
				WHERE a.date = $date AND b.id = $id\n \
				CREATE (a)-[r:Tets]->(b)\n \
				RETURN r', 
			{ date: ticket.date, id: ticket_id, });
			await session.run(
				'MATCH (a:Baggage), (b:Ticket)\n \
				WHERE a.baggage = $baggage AND b.id = $id\n \
				CREATE (a)-[r:Tets]->(b)\n \
				RETURN r', 
			{ baggage: ticket.baggage, id: ticket_id, });
			await session.run(
				'MATCH (a:Seller), (b:Ticket)\n \
				WHERE a.seller = $seller AND b.id = $id\n \
				CREATE (a)-[r:Tets]->(b)\n \
				RETURN r', 
			{ seller: ticket.seller, id: ticket_id, });
			await session.run(
				'MATCH (a:Transfer), (b:Ticket)\n \
				WHERE a.transfer = $transfer AND b.id = $id\n \
				CREATE (a)-[r:Tets]->(b)\n \
				RETURN r', 
			{ transfer: ticket.transfer, id: ticket_id, });
			global.redis_client.set(ticket_id, JSON.stringify({ ticket: ticket, id: ticket_id }), (err, res)=>{ if(err) throw err; });
		}
		catch(err){
			console.error(err);
		}
		finally{
			session.close();
		}		
	}}}}}}}
};
