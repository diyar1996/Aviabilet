const mongoose = require('mongoose');
const passport = require('passport');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const sha512 = require('js-sha512');
const uuidv4 = require('uuid').v4;

var UserSchema = new Schema({
    username: String,
    password: String,
    token: String
});

UserSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', UserSchema);
module.exports.Model = User;

module.exports.register = (req, res) => {
	User.register(new User({ username : req.body.username, token: uuidv4() }), 
	req.body.password, (err, user) => {
    	if (err) return res.render('register', { user : user });
    	
		passport.authenticate('local')(req, res, () => {
    	  	res.redirect('/');
    	});
  	});
};

module.exports.login = (req, res) => {
	passport.authenticate('local')(req, res, () => {
    	res.redirect('/');
  	});
};
