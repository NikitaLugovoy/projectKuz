let express = require("express");
let axios = require('axios');
const Handlebars = require('handlebars');

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

hbs.registerHelper('eq', function (a, b) {
    return a === b;
});

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



// Схема студента
let studentSchema = new mongoose.Schema({
    username: String,
    phone_number: String,
    email: String,
    additional_info: String,
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group' // Reference to the Group model
    }
});


let Student = mongoose.model('Student', studentSchema);



app.get('/students', async (req, res) => {
    try {
        const students = await Student.find().populate('group_id'); // Populate group data
        const groups = await Group.find(); // Fetch all groups
        console.log(groups);
        res.render('student', { students, groups, groups2: groups }); // Pass students and groups to the HBS template

    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).send(error);
    }
});


app.post('/students', async (req, res) => {
    try {
        const { username, phone_number, email, additional_info, group_id } = req.body;
        const newStudent = new Student({
            username,
            phone_number,
            email,
            additional_info,
            group_id
        });

        const savedStudent = await newStudent.save();
        const populatedStudent = await Student.findById(savedStudent._id).populate('group_id'); // Populate group_id

        res.status(201).json(populatedStudent); // Return the populated student object
    } catch (error) {
        console.error('Error adding student:', error);
        res.status(500).json({ error: 'Error adding student' });
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
    const { username, phone_number, email, additional_info, group_id } = req.body;

    try {
        const updatedStudent = await Student.findByIdAndUpdate(studentId, {
            username,
            phone_number,
            email,
            additional_info,
            group_id // Обновляем группу студента
        }, { new: true }).populate('group_id'); // Популяризация данных группы

        res.json(updatedStudent); // Возвращаем обновлённого студента с данными группы
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при обновлении данных студента.');
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
        required: true,
    },
    login: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    group_id: {
        type: mongoose.Schema.Types.ObjectId, // References a group
        ref: 'Group', // Assuming you have a Group model
        required: false, // Group is not mandatory initially
    }
}, {
    timestamps: true
});


// Создание модели для учителей
const Teacher = mongoose.model('Teacher', teacherSchema);

app.get('/teachers', async (req, res) => {
    try {
        const teachers = await Teacher.find().populate('group_id'); // Populate the group info
        const groups = await Group.find(); // Fetch available groups
        res.render('teacher', { teachers, groups });
    } catch (error) {
        console.error('Ошибка при получении учителей:', error);
        res.status(500).send('Ошибка при получении учителей');
    }
});



app.post('/teachers', async (req, res) => {
    const { full_name, login, password, group_id } = req.body;

    const newTeacher = new Teacher({
        full_name,
        login,
        password,
        group_id
    });

    try {
        const savedTeacher = await newTeacher.save();
        const populatedTeacher = await Teacher.findById(savedTeacher._id).populate('group_id'); // Популяризация через повторный запрос
        res.status(201).json(populatedTeacher);
    } catch (error) {
        console.error('Ошибка при добавлении учителя:', error);
        res.status(500).send('Ошибка при добавлении учителя');
    }
});


app.put('/teachers/:id', async (req, res) => {
    const teacherId = req.params.id;
    const { full_name, login, password, group_id } = req.body;

    try {
        const updatedTeacher = await Teacher.findByIdAndUpdate(
            teacherId,
            { full_name, login, password, group_id },
            { new: true }
        ).populate('group_id'); // Populate group_id

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



