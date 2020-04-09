const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('../config.json');

if(!global.mongoMutex) { global.mongoMutex = false; }

const userScheme = new Schema({
	username: { type: String, required: true, unique: true },
	passwordHash: { type: String, required: true },
	token: { type: String, required: true, unique: true }
})
const User = mongoose.model("User", userScheme);
const connect = () => {
	global.mongoMutex = true;
	return mongoose.connect(config.mongodb.url, { useNewUrlParser: true, useUnifiedTopology: true });
}
const disconnect = () => {
	mongoose.disconnect();
	global.mongoMutex = false;
}

module.exports.addUser = (username, passwordHash, token) => {
	return new Promise((resolve, reject) => {
		while(global.mongoMutex) {}
		console.log('[mongo][info] Adding user: ' + username + ":" + token);
		connect()
		.then(()=>{
			new User({
				username: username,
				passwordHash: passwordHash,
				token: token
			}).save()
			.then(()=>{
				disconnect();
				console.log('[mongo][info] User: ' + username + ":" + token + " successfuly added");
				resolve();
			})
			.catch((err)=>{
				console.log('[mongo][info] User: ' + username + "token" + token + ' already exist');
				disconnect();
				reject({ type: "user-exist", error: err});
			})
		})
		.catch((err)=>{
			console.log('[mongodb][error] Connection error');
			disconnect();
			reject({ type: "connection-error", error: err});
		})
	});
};

module.exports.getUserByName = (username) => {
	return new Promise((resolve, reject) => {
		while(global.mongoMutex) {}
		console.log('[mongo][info] Trying to find user by name: ' + username);
		connect()
		.then(()=>{
			User.findOne({username: username}).exec()
			.then((obj) => {
				console.log('[mongo][info] User successfuly founded ' + obj.username + ":" + obj.token);
				disconnect();
				resolve(obj);
			})
			.catch((err) => {
				console.log('[mongo][error] User not founded');
				disconnect();
				reject({ type: "not-founded", error: err });
			});
		})
		.catch((err)=>{
			console.log('[mongo][error] Connection error');
			disconnect();
			reject({ type: "connection-error", error: err});
		})
	});
};

module.exports.getUserByToken = (token) => {
	return new Promise((resolve, reject) => {
		while(global.mongoMutex) {}
		console.log('[mongo][info] Trying to find user by token: ' + token);
		connect()
		.then(()=>{
			User.findOne({ token: token }).exec()
			.then((obj) => {
				console.log('[mongo][info] User successfuly founded ' + obj.username + ":" + obj.token);
				disconnect();
				resolve(obj);
			})
			.catch((err) => {
				console.log('[mongo][error] User not founded');
				disconnect();
				reject({ type: "not-founded", error: err });
			});
		})
		.catch((err)=>{
			console.log('[mongo][error] Connection error');
			disconnect();
			reject({ type: "connection-error", error: err});
		})
	});
};


