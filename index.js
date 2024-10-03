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


let achievementSchema = new mongoose.Schema({
    achievement_details: {
        type: String,
        required: true, // Required field for achievement details
    },
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student' // Reference to the Student model
    }
});

// Создание модели для достижений
let Achievement = mongoose.model('Achievement', achievementSchema);
// Получение всех достижений
// Получение всех достижений
app.get('/achievements', async (req, res) => {
    try {
        const achievements = await Achievement.find().populate('student_id'); // Популяция студента
        console.log('Достижения:', achievements);
        res.render('achievements', { achievements, students: await Student.find() }); // Передаем достижения и студентов в шаблон
    } catch (error) {
        console.error('Ошибка при получении достижений:', error);
        res.status(500).send('Ошибка при получении достижений');
    }
});

// Добавление нового достижения с привязкой к студенту
app.post('/achievements', async (req, res) => {
    const { achievement_details, student_id } = req.body; // Извлекаем student_id

    const newAchievement = new Achievement({
        achievement_details,
        student_id // Привязываем достижение к студенту
    });

    try {
        const savedAchievement = await newAchievement.save();
        await savedAchievement.populate('student_id'); // Populate the student_id
        res.status(201).json(savedAchievement);
    } catch (error) {
        console.error('Ошибка при добавлении достижения:', error);
        res.status(500).send('Ошибка при добавлении достижения');
    }
});
// Обновление достижения с новым студентом
app.put('/achievements/:id', async (req, res) => {
    const achievementId = req.params.id;
    const { achievement_details, student_id } = req.body; // Извлекаем данные из запроса

    try {
        // Находим и обновляем достижение
        const updatedAchievement = await Achievement.findByIdAndUpdate(
            achievementId,
            { achievement_details, student_id }, // Обновляем достижение и студента
            { new: true, runValidators: true } // Возвращаем новое значение и включаем валидацию
        ).populate('student_id'); // Популяция студента

        if (!updatedAchievement) {
            return res.status(404).send('Достижение не найдено.');
        }

        res.status(200).json(updatedAchievement); // Возвращаем обновлённое достижение
    } catch (error) {
        console.error('Ошибка при редактировании достижения:', error);
        res.status(500).send('Ошибка при редактировании достижения');
    }
});

// Удаление достижения
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


// Определение схемы для публичных активностей
let publicActivitySchema = new mongoose.Schema({
    participation_details: {
        type: String,
        required: true // Обязательное поле для деталей участия
    },
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student' // Ссылка на модель студента
    },
    has_pushkin_card: {
        type: Boolean,
        required: true // Обязательное поле для наличия карточки
    }
});

// Создание модели для публичных активностей
let PublicActivity = mongoose.model('PublicActivity', publicActivitySchema);

// Получение всех публичных активностей
app.get('/publicactivities', async (req, res) => {
    try {
        const publicActivities = await PublicActivity.find().populate('student_id'); // Популяция студента
        console.log('Публичные активности:', publicActivities);
        res.render('publicactivities', { publicActivities, students: await Student.find() }); // Передаем активности и студентов в шаблон
    } catch (error) {
        console.error('Ошибка при получении публичных активностей:', error);
        res.status(500).send('Ошибка при получении публичных активностей');
    }
});

// Добавление новой публичной активности с привязкой к студенту
app.post('/publicactivities', async (req, res) => {
    const { participation_details, student_id, has_pushkin_card } = req.body; // Извлекаем данные

    const newPublicActivity = new PublicActivity({
        participation_details,
        student_id, // Привязываем активность к студенту
        has_pushkin_card // Указываем наличие карточки
    });

    try {
        const savedPublicActivity = await newPublicActivity.save();
        await savedPublicActivity.populate('student_id'); // Популяция student_id
        res.status(201).json(savedPublicActivity);
    } catch (error) {
        console.error('Ошибка при добавлении публичной активности:', error);
        res.status(500).send('Ошибка при добавлении публичной активности');
    }
});

// Обновление публичной активности с новым студентом
app.put('/publicactivities/:id', async (req, res) => {
    const publicActivityId = req.params.id;
    const { participation_details, student_id, has_pushkin_card } = req.body; // Извлекаем данные из запроса

    try {
        // Находим и обновляем активность
        const updatedPublicActivity = await PublicActivity.findByIdAndUpdate(
            publicActivityId,
            { participation_details, student_id, has_pushkin_card }, // Обновляем детали активности и студента
            { new: true, runValidators: true } // Возвращаем новое значение и включаем валидацию
        ).populate('student_id'); // Популяция студента

        if (!updatedPublicActivity) {
            return res.status(404).send('Публичная активность не найдена.');
        }

        res.status(200).json(updatedPublicActivity); // Возвращаем обновлённую активность
    } catch (error) {
        console.error('Ошибка при редактировании публичной активности:', error);
        res.status(500).send('Ошибка при редактировании публичной активности');
    }
});

// Удаление публичной активности
app.delete('/publicactivities/:id', async (req, res) => {
    const publicActivityId = req.params.id;

    try {
        const deletedPublicActivity = await PublicActivity.findByIdAndDelete(publicActivityId);
        if (!deletedPublicActivity) {
            return res.status(404).send('Публичная активность не найдена.');
        }
        res.status(200).send('Публичная активность успешно удалена.');
    } catch (error) {
        console.error('Ошибка при удалении публичной активности:', error);
        res.status(500).send('Ошибка при удалении публичной активности.');
    }
});
