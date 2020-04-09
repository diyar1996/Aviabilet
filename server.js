

//     Конфигурация
// --------------------
MONGO_URI = "mongodb+srv://bilet:aviabilet@aviabilet-qff32.mongodb.net/test?retryWrites=true&w=majority";
REDIS_URI = "redis://localhost:6379";

NEO4J_URI = "bolt://localhost:7687/aviabilet";
NEO4J_ENABLE_AUTH = false;
NEO4J_USER = "root";
NEO4J_PASS = "root";

INFLUXDB_URI = "http://127.0.0.1:8086/aviabilet";

// ====================



//     Импорт библиотек
// ------------------------
const favicon = require('serve-favicon');
const logger = require('morgan');

const express = require('express');
const http = require('http');
const path = require('path');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
// ========================


//     Настройка Mongoose
// --------------------------
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true})
.then(() =>  console.log('[mongo][success]MongoDB connected succesful'))
.catch((err) => console.error(err));
// ==========================

//     Настройка Neo4J
// -----------------------
const neo4j = require('neo4j-driver');
if(NEO4J_ENABLE_AUTH) global.neo4j_driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));
else global.neo4j_driver = neo4j.driver(NEO4J_URI);
// =======================



//     Настройка Redis
// -----------------------
const redis = require("redis");
global.redis_client = redis.createClient(REDIS_URI);
// =======================


const Influx = require('influxdb-nodejs');
global.influx_client = new Influx(INFLUXDB_URI);


const tickets = require('./tickets');
const cart = require('./cart');


//     Настройка ExpressJS
// ---------------------------
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'secret_phrase',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
// ===========================



//     Настройка авторизации
// -----------------------------
const User = require('./models/User');
passport.use(new LocalStrategy(User.Model.authenticate()));
passport.serializeUser(User.Model.serializeUser());
passport.deserializeUser(User.Model.deserializeUser());
// =============================

//     Маршрутизация
// ---------------------
app.get('/', (req, res) => {            //Домашняя страница
	res.render('index', {user: req.user});});

app.get('/register', (req, res) => {    
	if(req.user) res.redirect('/');	
	res.render('register'); });			//Страница регистрации
app.post('/register', User.register);   //Запрос регистрации

app.get('/login', (req, res) => {
	if(req.user) res.redirect('/');
	res.render('login'); });            //Страница входа
app.post('/login', User.login);         //Запрос входа

app.get('/logout', (req, res) => {      //Запрос деавторизации
	req.logout();
	res.redirect('/');
});

app.get('/search', (req, res) => {      //Страница поиска	
	res.render('search', { filter: req.body, user: req.user, result: null });
});
app.post('/search', (req, res) => {      //Страница поиска
	tickets.get(req.body)
	.then((result)=>{
		res.render('search', { filter: req.body, user: req.user, result: result });
	})
	.catch(()=>{});
});

app.get('/admin', (req, res) => {      //Страница поиска
	res.render('admin');
});
app.post('/admin', (req, res) => {      //Страница поиска
	tickets.add(req.body);	
	res.render('admin');
});

app.get('/cart', (req, res) => {      //Страница корзины
	if(!req.user) res.redirect('/login');	
	
	cart.get(req.user.token)
	.then((cartData) => {
		let ids = [];
		for(var i = 0; i < cartData.length; i++){
			console.log(cartData[i].ticket_id)
			ids.push(cartData[i].ticket_id);
		}
		tickets.getTicketList(ids)
		.then((tickets) => {
			let result = [];			
			for(var i = 0; i < tickets.length; i++){
				result.push({ id: cartData[i].id, ticket: tickets[i]});
			}

			res.render('cart', { user: req.user, result: result });
		});
	});
});
app.post('/cart/add', (req, res) => {      //Страница корзины
	if(!req.user) res.redirect('/login');
	cart.add(req.user.token, req.body.ticket_id);		
	res.redirect('/cart');
});

app.get('/orders', (req, res) => {      //Страница заказов
	if(!req.user) res.redirect('/login');	
	
	cart.getOrders(req.user.token)
	.then((cartData) => {
		let ids = [];
		for(var i = 0; i < cartData.length; i++){
			console.log(cartData[i].ticket_id)
			ids.push(cartData[i].ticket_id);
		}
		tickets.getTicketList(ids)
		.then((tickets) => {
			let result = [];			
			for(var i = 0; i < tickets.length; i++){
				result.push({ id: cartData[i].id, ticket: tickets[i]});
			}

			res.render('orders', { user: req.user, result: result });
		});
	});
});

app.get('/buy', (req, res) => {
	res.redirect('/');
});

app.post('/buy', (req, res) => {     
	if(!req.user) res.redirect('/login');
	if(req.body.id){	
		cart.buy(req.user.token, req.body.id);		
		res.redirect('/orders');
	}
	else {
		res.redirect('/');	
	}
});

app.get('/cart/remove', (req, res) => {
	res.redirect('/');
});

app.post('/cart/remove', (req, res) => {    
	if(!req.user) res.redirect('/login');
	if(req.body.id){	
		cart.remove(req.user.token, req.body.id);		
		res.redirect('/cart');
	}
	else {
		res.redirect('/');	
	}
});

// =====================


//     Обработка ошибок
// ------------------------
app.use((req, res, next) => {
	const err = new Error('Not Found');
  	err.status = 404;
  	next(err);
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});
// ========================


// Запуск сервера
app.listen(80);




