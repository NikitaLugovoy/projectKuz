let express = require("express");
let axios = require('axios');
let app = express();
let port = 3005;

app.listen(port, function () {
    console.log(`http://localhost:${port}`);
})

app.use(express.json());
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Настройка БД
let mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/events');

// Схемы
let eventSchema = new mongoose.Schema({
    nickname: String,
    password: String,
    lastName: String,
    firsName: String,
    patronymic: String,
    nationality: String,
    birthday: Date,
    group: String,
    photo: String
});

let Event = mongoose.model('user', eventSchema);

const hbs = require('hbs');
app.set('views', 'views');
app.set('view engine', 'hbs');
// Раздача статики
app.use(express.static("static"));

app.get('/', async (req,res) => {
    res.render('login');
})

app.post('/login', async (req, res) => {
    let login = req.body.login;
    let password = req.body.password;
    try {
        let event = await Event.findOne({ login: login, password: password });

        if (!event) {
            res.render('login');
        } else {
            res.render('index', { event: event });
        }
    } catch (error) {
        console.error('Ошибка при выполнении запроса к базе данных:', error);
        res.status(500).send('Произошла ошибка при выполнении запроса к базе данных');
    }
});

app.get('/register', async (req, res) => {
    res.render('registr');
});

app.post('/register', async (req, res) => {
    let nickname = req.body.nickname;
    let login = req.body.login;
    let password = req.body.password;

    let event = new Event({
        nickname: nickname,
        login: login,
        password: password
    });
    await event.save();
    res.redirect('/');
});

