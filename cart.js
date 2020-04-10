
const uuidv4 = require('uuid').v4;

const fieldSchema = {
	purchased: 'b',
	token: 's',
	ticket_id: 's',
	id: 's',
	existing: 'b'
};

global.influx_client.schema('cart_item', fieldSchema, {}, {
  // default is false
  stripUnknown: true,
});

module.exports.get = (token) => {
	return new Promise((resolve, reject) => {
		global.influx_client.query('cart_item')
		.where('token', token)
		.where('purchased', false)
		.where('existing', true)
		.set({ format: "json" })
		.then((data)=> {
			console.log(data);
			resolve(data.cart_item || []);
		})
		.catch((err)=> {
			console.error(err);
			reject(err);
		});
	});
};

module.exports.getItem = (token, id) => {
	return new Promise((resolve, reject) => {
		global.influx_client.query('cart_item')
		.where('token', token)
		.where('id', id)
		.where('existing', true)
		.set({ format: "json" })
		.then((data)=> {
			resolve(data.cart_item[0] || null);
		})
		.catch((err)=> {
			console.error(err);
			reject(err);
		});
	});
};

module.exports.buy = (token, id) => {
	return new Promise((resolve, reject) => {
		module.exports.getItem(token, id) 
		.then((item) => {
			if(!item) return reject();
			module.exports.remove(token, id)
			.then(() => {
				item.purchased = true;
				item.id = uuidv4();
				item.existing = true;
				module.exports.addRaw(item);
				resolve();
			})
			.catch((err) => {
				return reject(err);
			});
		})
		.catch((err) => {
			return reject(err);
		})
	});
}

module.exports.remove = (token, id) => {
	return new Promise((resolve, reject) => {
		module.exports.getItem(token, id) 
		.then((item) => {
			if(!item) return resolve();
			
			//global.influx_client.queryRaw("")
			//.then(resolve)
			//.catch(reject);			
		})
		.catch((err) => {
			return reject(err);
		})
	});
}

module.exports.add = (token, ticketId) => {
	global.influx_client.write('cart_item')
	.field({
		purchased: false,
		id: uuidv4(),
		token: token,
		ticket_id: ticketId,
		existing: true
	})
	.then(() => { console.log("Ticket added to cart") })
	.catch((err)=>{
		console.error(err);
	});	
};

module.exports.addRaw = (raw) => {
	global.influx_client.write('cart_item')
	.field({
		purchased: raw.purchased,
		id: raw.id,
		token: raw.token,
		ticket_id: raw.ticket_id,
		existing: raw.existing
	})
	.then(() => { console.log("Ticket added to cart") })
	.catch((err)=>{
		console.error(err);
	});	
};

module.exports.getOrders = (token) => {
	return new Promise((resolve, reject) => {
		global.influx_client.query('cart_item')
		.where('token', token)
		.where('purchased', true)
		.set({ format: "json" })
		.then((data)=> {
			resolve(data.cart_item || []);
		})
		.catch((err)=> {
			console.error(err);
			reject(err);
		});
	});
};

