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




// Схема студента
let studentSchema = new mongoose.Schema({
    username: String,
    phone_number: String,
    email: String,
    additional_info: String
});

let Student = mongoose.model('Student', studentSchema);



app.get('/students', async (req, res) => {
    try {
        const students = await Student.find();
        res.render('student', { students }); // Render the HBS template and pass the students data
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).send(error);
    }
});

app.post('/students', async (req, res) => {
    const { username, phone_number, email, additional_info } = req.body;

    const newStudent = new Student({
        username,
        phone_number,
        email,
        additional_info
    });

    try {
        const savedStudent = await newStudent.save();
        res.status(201).json(savedStudent);
    } catch (error) {
        console.error('Ошибка при добавлении студента:', error);
        res.status(500).send('Ошибка при добавлении студента');
    }
});

// Read a single student by ID
app.get('/students/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).send('Student not found');
        }
        res.status(200).send(student);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).send(error);
    }
});

app.post('/students/:id', async (req, res) => {
    const studentId = req.params.id;
    const { username, phone_number, email, additional_info } = req.body;
    
    try {
        await Student.findByIdAndUpdate(studentId, {
            username,
            phone_number,
            email,
            additional_info
        });
        res.redirect('/students'); // Redirect back to the students page after update
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).send(error);
    }
});

app.put('/students/:id', async (req, res) => {
    const studentId = req.params.id;
    const { username, phone_number, email, additional_info } = req.body;

    try {
        const updatedStudent = await Student.findByIdAndUpdate(
            studentId,
            { username, phone_number, email, additional_info },
            { new: true }
        );

        if (!updatedStudent) {
            return res.status(404).send('Студент не найден.');
        }

        res.status(200).json(updatedStudent);
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).send(error);
    }
});


// Delete a student by ID
app.delete('/students/:id', async (req, res) => {
    const studentId = req.params.id;
    
    try {
        await Student.findByIdAndDelete(studentId);
        res.status(204).send(); // No content, indicates successful deletion
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).send(error);
    }
});




const teacherSchema = new mongoose.Schema({
    full_name: {
        type: String,
        required: true, // Полное имя обязательно
    },
    login: {
        type: String,
        required: true, // Логин обязательно
        unique: true,   // Логин должен быть уникальным
    },
    password: {
        type: String,
        required: true, // Пароль обязательно
    },
}, {
    timestamps: true // Автоматическое добавление полей createdAt и updatedAt
});

// Создание модели для учителей
const Teacher = mongoose.model('Teacher', teacherSchema);

app.get('/teachers', async (req, res) => {
    try {
        const teachers = await Teacher.find();
        res.render('teacher', { teachers });
    } catch (error) {
        console.error('Ошибка при получении учителей:', error);
        res.status(500).send('Ошибка при получении учителей');
    }
});


app.post('/teachers', async (req, res) => {
    const { full_name, login, password } = req.body;

    const newTeacher = new Teacher({
        full_name,
        login,
        password
    });

    try {
        const savedTeacher = await newTeacher.save();
        res.status(201).json(savedTeacher);
    } catch (error) {
        console.error('Ошибка при добавлении учителя:', error);
        res.status(500).send('Ошибка при добавлении учителя');
    }
});


app.put('/teachers/:id', async (req, res) => {
    const teacherId = req.params.id;
    const { full_name, login, password } = req.body;

    try {
        const updatedTeacher = await Teacher.findByIdAndUpdate(teacherId, { full_name, login, password }, { new: true });
        if (!updatedTeacher) {
            return res.status(404).send('Учитель не найден.');
        }
        res.status(200).json(updatedTeacher);
    } catch (error) {
        console.error('Ошибка при редактировании учителя:', error);
        res.status(500).send('Ошибка при редактировании учителя');
    }
});


app.delete('/teachers/:id', async (req, res) => {
    const teacherId = req.params.id;

    try {
        const deletedTeacher = await Teacher.findByIdAndDelete(teacherId);
        if (!deletedTeacher) {
            return res.status(404).send('Учитель не найден.');
        }
        res.status(200).send('Учитель успешно удален.');
    } catch (error) {
        console.error('Ошибка при удалении учителя:', error);
        res.status(500).send('Ошибка при удалении учителя');
    }
});




// Создание схемы для групп
const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, // Название группы обязательно
        unique: true,   // Название должно быть уникальным
    }
}, {
    timestamps: true // Автоматическое добавление полей createdAt и updatedAt
});

// Создание модели для групп
const Group = mongoose.model('Group', groupSchema);



// Get all groups
app.get('/groups', async (req, res) => {
    try {
        const groups = await Group.find();
        res.render('group', { groups }); // Render the HBS template with groups data
    } catch (error) {
        console.error('Ошибка при получении групп:', error);
        res.status(500).send('Ошибка при получении групп');
    }
});

// Create a new group
app.post('/groups', async (req, res) => {
    const { name } = req.body;

    const newGroup = new Group({
        name
    });

    try {
        const savedGroup = await newGroup.save();
        res.status(201).json(savedGroup);
    } catch (error) {
        console.error('Ошибка при добавлении группы:', error);
        res.status(500).send('Ошибка при добавлении группы');
    }
});

// Update a group
app.put('/groups/:id', async (req, res) => {
    const groupId = req.params.id;
    const { name } = req.body;

    try {
        const updatedGroup = await Group.findByIdAndUpdate(groupId, { name }, { new: true });
        if (!updatedGroup) {
            return res.status(404).send('Группа не найдена.');
        }
        res.status(200).json(updatedGroup);
    } catch (error) {
        console.error('Ошибка при редактировании группы:', error);
        res.status(500).send('Ошибка при редактировании группы');
    }
});

// Delete a group
app.delete('/groups/:id', async (req, res) => {
    const groupId = req.params.id;

    try {
        const deletedGroup = await Group.findByIdAndDelete(groupId);
        if (!deletedGroup) {
            return res.status(404).send('Группа не найдена.');
        }
        res.status(200).send('Группа успешно удалена.');
    } catch (error) {
        console.error('Ошибка при удалении группы:', error);
        res.status(500).send('Ошибка при удалении группы');
    }
});


// Схема достижений
let achievementSchema = new mongoose.Schema({
    achievement_details: {
        type: String,
        required: true, // Обязательное поле для деталей достижения
    }
});

// Создание модели для достижений
let Achievement = mongoose.model('Achievement', achievementSchema);

app.get('/achievements', async (req, res) => {
    try {
        const achievements = await Achievement.find();
        res.render('achievements', { achievements }); // Render the HBS template with achievements data
    } catch (error) {
        console.error('Ошибка при получении достижений:', error);
        res.status(500).send('Ошибка при получении достижений');
    }
});

// Create a new achievement
app.post('/achievements', async (req, res) => {
    const { achievement_details } = req.body;

    const newAchievement = new Achievement({
        achievement_details
    });

    try {
        const savedAchievement = await newAchievement.save();
        res.status(201).json(savedAchievement);
    } catch (error) {
        console.error('Ошибка при добавлении достижения:', error);
        res.status(500).send('Ошибка при добавлении достижения');
    }
});

// Update an achievement
app.put('/achievements/:id', async (req, res) => {
    const achievementId = req.params.id;
    const { achievement_details } = req.body;

    try {
        const updatedAchievement = await Achievement.findByIdAndUpdate(
            achievementId,
            { achievement_details },
            { new: true }
        );

        if (!updatedAchievement) {
            return res.status(404).send('Достижение не найдено.');
        }

        res.status(200).json(updatedAchievement);
    } catch (error) {
        console.error('Ошибка при редактировании достижения:', error);
        res.status(500).send('Ошибка при редактировании достижения');
    }
});

// Delete an achievement
app.delete('/achievements/:id', async (req, res) => {
    const achievementId = req.params.id;

    try {
        const deletedAchievement = await Achievement.findByIdAndDelete(achievementId);
        if (!deletedAchievement) {
            return res.status(404).send('Достижение не найдено.');
        }
        res.status(200).send('Достижение успешно удалено.');
    } catch (error) {
        console.error('Ошибка при удалении достижения:', error);
        res.status(500).send('Ошибка при удалении достижения');
    }
});
