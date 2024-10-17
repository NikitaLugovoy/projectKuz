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

app.use(express.urlencoded({ extended: true }));

// Настройка БД
let mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/events');

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
const Teacher = mongoose.model('teachers', teacherSchema);

const hbs = require('hbs');
app.set('views', 'views');
app.set('view engine', 'hbs');

// Раздача статики
app.use(express.static("static"));

hbs.registerHelper('eq', function (a, b) {
    return a === b;
});

// Register custom 'includes' helper
hbs.registerHelper('includes', function(array, value) {
    return Array.isArray(array) && array.includes(value);
});

hbs.registerHelper('formatDate', function(date) {
    return new Date(date).toLocaleDateString();
});

app.get('/', async (req,res) => {
    res.render('login');
})

app.post('/login', async (req, res) => {
    let login = req.body.login;
    let password = req.body.password;
    try {
        let teacher = await Teacher.findOne({ login: login, password: password });

        if (!teacher) {
            return res.redirect('/'); // Используем return здесь
        } else if (teacher._id.toString() === "670a3e24d22ff84496a6001b") {
            res.redirect(`/menu/${teacher._id}`)
        } else {
            return res.redirect(`/parts/${teacher._id}`); // Используем return здесь, если нужно
        }
    } catch (error) {
        console.error('Ошибка при выполнении запроса к базе данных:', error);
        res.status(500).send('Произошла ошибка при выполнении запроса к базе данных');
    }
});

app.get(`/menu/:teacherId`, async (req, res) =>{
    res.render(`menu`)
})

app.get('/register', async (req, res) => {
    res.render('registr');
});

app.post('/register', async (req, res) => {
    let full_name = req.body.full_name;
    let login = req.body.login;
    let password = req.body.password;

    let teacher = new Teacher({
        full_name: full_name,
        login: login,
        password: password
    });
    await teacher.save();
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
app.get('/groups/:teacherId', async (req, res) => {
    try {
        // Получаем ID преподавателя из параметров URL
        const teacherId = req.params.teacherId;

        // Проверяем, существует ли преподаватель в базе данных
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }

        // Получаем список групп
        const groups = await Group.find();

        // Рендерим шаблон с группами и передаем ID преподавателя
        res.render('group', { groups, teacherId });
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
app.get('/achievements/:teacherId', async (req, res) => {
    try {
        // Получаем ID преподавателя из параметров URL
        const teacherId = req.params.teacherId;

        // Проверяем, существует ли преподаватель (опционально)
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }

        // Получаем достижения и популяцию студентов
        const achievements = await Achievement.find().populate('student_id');

        // Передаем достижения, студентов и ID преподавателя в шаблон
        res.render('achievements', {
            achievements,
            students: await Student.find(), // Получаем список студентов
            teacherId // Передаем ID преподавателя в шаблон
        });
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

app.get('/students/:teacherId', async (req, res) => {
    try {
        // Получаем ID преподавателя из параметров URL
        const teacherId = req.params.teacherId;

        // Проверяем, существует ли преподаватель (опционально)
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }

        // Получаем студентов с популяцией данных о группах
        const students = await Student.find().populate('group_id');

        // Получаем все группы
        const groups = await Group.find();

        // Передаем студентов, группы и ID преподавателя в шаблон
        res.render('student', {
            students,
            groups,
            groups2: groups, // Для дополнительной выборки групп, если требуется
            teacherId // Передаем ID преподавателя
        });
    } catch (error) {
        console.error('Ошибка при получении студентов:', error);
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

app.get('/teachers/:teacherId', async (req, res) => {
    try {
        // Получаем ID преподавателя из параметров URL
        const teacherId = req.params.teacherId;

        // Проверяем, существует ли преподаватель (опционально)
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }
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
app.get('/publicactivities/:teacherId', async (req, res) => {
    try {
         // Получаем ID преподавателя из параметров URL
        const teacherId = req.params.teacherId;

         // Проверяем, существует ли преподаватель (опционально)
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }
        const publicActivities = await PublicActivity.find().populate('student_id'); // Популяция студента
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

// Определение схемы для категорий
let categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true // Обязательное поле для названия категории
    }
});

// Создание модели для категорий
let Category = mongoose.model('Category', categorySchema);

// Получение всех категорий
app.get('/categories/:teacherId', async (req, res) => {
    try {
        // Получаем ID преподавателя из параметров URL
        const teacherId = req.params.teacherId;
        // Проверяем, существует ли преподаватель (опционально)
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }
        // Получаем все категории
        const categories = await Category.find();
        // Передаем категории и ID преподавателя в шаблон
        res.render('categories', {
            categories,
            teacherId // Передаем ID преподавателя
        });
    } catch (error) {
        console.error('Ошибка при получении категорий:', error);
        res.status(500).send('Ошибка при получении категорий');
    }
});


// Добавление новой категории
app.post('/categories', async (req, res) => {
    const { name } = req.body; // Извлекаем название категории

    const newCategory = new Category({
        name // Создаем новую категорию
    });

    try {
        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory); // Возвращаем сохранённую категорию
    } catch (error) {
        console.error('Ошибка при добавлении категории:', error);
        res.status(500).send('Ошибка при добавлении категории');
    }
});

// Обновление категории по ID
app.put('/categories/:id', async (req, res) => {
    const categoryId = req.params.id;
    const { name } = req.body; // Извлекаем название категории

    try {
        // Находим и обновляем категорию
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { name }, // Обновляем название категории
            { new: true, runValidators: true } // Возвращаем новое значение и включаем валидацию
        );

        if (!updatedCategory) {
            return res.status(404).send('Категория не найдена.');
        }

        res.status(200).json(updatedCategory); // Возвращаем обновлённую категорию
    } catch (error) {
        console.error('Ошибка при редактировании категории:', error);
        res.status(500).send('Ошибка при редактировании категории');
    }
});

// Удаление категории
app.delete('/categories/:id', async (req, res) => {
    const categoryId = req.params.id;

    try {
        const deletedCategory = await Category.findByIdAndDelete(categoryId);
        if (!deletedCategory) {
            return res.status(404).send('Категория не найдена.');
        }
        res.status(200).send('Категория успешно удалена.');
    } catch (error) {
        console.error('Ошибка при удалении категории:', error);
        res.status(500).send('Ошибка при удалении категории.');
    }
});

// Определение схемы для частей
const partSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true, // Обязательное поле для названия части
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId, // Ссылка на категорию
        ref: 'Category', // Предполагается, что у вас есть модель Category
        required: false, // Связь с категорией не обязательна
    }
}, {
    timestamps: true // Добавляет поля createdAt и updatedAt
});

// Создание модели для частей
const Part = mongoose.model('Part', partSchema);

// Получение всех частей
app.get('/parts/:teacherId', async (req, res) => {
    try {
        // Получаем ID преподавателя из параметров URL
        const teacherId = req.params.teacherId;

        // Проверяем, есть ли такой преподаватель в базе данных (опционально)
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }

        // Получаем части и категории
        const parts = await Part.find().populate('category_id'); // Заполнение информации о категории
        const categories = await Category.find(); // Получение доступных категорий

        // Передаем части, категории и ID преподавателя в шаблон
        res.render('parts', { parts, categories, teacherId });
    } catch (error) {
        console.error('Ошибка при получении частей:', error);
        res.status(500).send('Ошибка при получении частей');
    }
});


// Добавление новой части
app.post('/parts', async (req, res) => {
    const { title, category_id } = req.body; // Извлечение данных из тела запроса

    const newPart = new Part({
        title,
        category_id
    });

    try {
        const savedPart = await newPart.save(); // Сохранение новой части
        const populatedPart = await Part.findById(savedPart._id).populate('category_id'); // Повторный запрос для заполнения информации о категории
        res.status(201).json(populatedPart); // Возврат сохраненной части
    } catch (error) {
        console.error('Ошибка при добавлении части:', error);
        res.status(500).send('Ошибка при добавлении части');
    }
});

// Обновление части по ID
app.put('/parts/:id', async (req, res) => {
    const partId = req.params.id; // Получение ID части из параметров
    const { title, category_id } = req.body; // Извлечение данных из тела запроса

    try {
        const updatedPart = await Part.findByIdAndUpdate(
            partId,
            { title, category_id }, // Обновление названия и категории
            { new: true } // Возврат обновленного значения
        ).populate('category_id'); // Заполнение информации о категории

        if (!updatedPart) {
            return res.status(404).send('Часть не найдена.');
        }

        res.status(200).json(updatedPart); // Возврат обновленной части
    } catch (error) {
        console.error('Ошибка при редактировании части:', error);
        res.status(500).send('Ошибка при редактировании части');
    }
});

// Удаление части
app.delete('/parts/:id', async (req, res) => {
    const partId = req.params.id; // Получение ID части из параметров

    try {
        const deletedPart = await Part.findByIdAndDelete(partId); // Удаление части
        if (!deletedPart) {
            return res.status(404).send('Часть не найдена.');
        }
        res.status(200).send('Часть успешно удалена.'); // Успешное удаление
    } catch (error) {
        console.error('Ошибка при удалении части:', error);
        res.status(500).send('Ошибка при удалении части.');
    }
});

app.get('/account/:teacherId', async (req, res) => {
    try {
        let teacherId = req.params.teacherId;  // Получение ID преподавателя из URL
        const teacher = await Teacher.findOne({ _id: teacherId });
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }
        // Отправляем данные в шаблон
        res.render('account', { teacher });
    } catch (error) {
        console.error('Ошибка при получении данных преподавателя:', error);
        res.status(500).send('Ошибка при получении данных преподавателя');
    }
});


// Схема для коллекции reportpartinfo
const reportPartInfoSchema = new mongoose.Schema({
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group', // Ссылка на коллекцию Group
        required: true // Группа обязательна
    },
    student_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student', // Ссылка на коллекцию Student
        required: true // Студенты обязательны
    }],
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', // Ссылка на коллекцию Category
        required: true // Категория обязательна
    },
    part_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Part', // Ссылка на коллекцию Part
        required: true // Часть обязательна
    },
    date: {
        type: Date,
        required: true // Дата обязательна
    },
    photo: {
        type: String, // Пусть это будет строка для хранения пути к файлу изображения
        required: false // Фото не обязательно
    },
    details: {
        type: String, // Поле для детальной информации
        required: false // Информация не обязательна
    }
}, {
    timestamps: true // Поля createdAt и updatedAt
});

// Создание модели для reportPartInfo
const ReportPartInfo = mongoose.model('ReportPartInfo', reportPartInfoSchema);


// Fetch students by group (for the group select event)
app.get('/groups/:id/students', async (req, res) => {
    const { id } = req.params;

    try {
        const students = await Student.find({ group_id: id });
        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).send('Server error');
    }
});

// Fetch parts by category (for the category select event)
app.get('/categories/:id/parts', async (req, res) => {
    const { id } = req.params;

    try {
        const parts = await Part.find({ category_id: id });
        res.json(parts);
    } catch (error) {
        console.error('Error fetching parts:', error);
        res.status(500).send('Server error');
    }
});


app.get('/groups/:groupId/students', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const students = await Student.find({ group_id: groupId }); // Или как у вас настроена связь с группами
        res.json(students);
        
        console.log("Students" + students);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении студентов' });
    }
});


app.get('/categories/:categoryId/parts', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const parts = await Part.find({ category_id: categoryId }).populate('category_id', 'name');
        res.json(parts);
    } catch (error) {
        console.error('Ошибка при получении частей:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.get('/report-part-info/:teacherId', async (req, res) => {
    try {
        const reports = await ReportPartInfo.find()
            .populate('group_id')
            .populate('student_ids')
            .populate('category_id')
            .populate('part_id');
        const groups = await Group.find();
        const students = await Student.find();
        const categories = await Category.find();
        const parts = await Part.find();

        res.render('reportPartInfo', { reports, groups, students, categories, parts });
    } catch (error) {
        console.error('Ошибка при получении отчётов:', error);
        res.status(500).send('Ошибка при получении отчётов');
    }
});



app.post('/report-part-info', async (req, res) => {
    const { group_id, student_ids, category_id, part_id, date, photo, details } = req.body;

    const newReport = new ReportPartInfo({
        group_id,
        student_ids,
        category_id,
        part_id,
        date,
        photo,
        details
    });

    try {
        const savedReport = await newReport.save();
        const populatedReport = await ReportPartInfo.findById(savedReport._id)
            .populate('group_id')
            .populate('student_ids')
            .populate('category_id')
            .populate('part_id');

        res.status(201).json(populatedReport);
    } catch (error) {
        console.error('Ошибка при добавлении отчёта:', error);
        res.status(500).send('Ошибка при добавлении отчёта');
    }
});



app.put('/report-part-info/:id', async (req, res) => {
    const reportId = req.params.id;
    const { group_id, student_ids, category_id, part_id, date, photo, details } = req.body;

    try {
        const updatedReport = await ReportPartInfo.findByIdAndUpdate(
            reportId,
            { group_id, student_ids, category_id, part_id, date, photo, details },
            { new: true }
        )
            .populate('group_id')
            .populate('student_ids')
            .populate('category_id')
            .populate('part_id');

        if (!updatedReport) {
            return res.status(404).send('Отчёт не найден.');
        }

        res.status(200).json(updatedReport);
    } catch (error) {
        console.error('Ошибка при обновлении отчёта:', error);
        res.status(500).send('Ошибка при обновлении отчёта');
    }
});



app.delete('/report-part-info/:id', async (req, res) => {
    const reportId = req.params.id;

    try {
        const deletedReport = await ReportPartInfo.findByIdAndDelete(reportId);
        if (!deletedReport) {
            return res.status(404).send('Отчёт не найден.');
        }

        res.status(200).send('Отчёт успешно удалён.');
    } catch (error) {
        console.error('Ошибка при удалении отчёта:', error);
        res.status(500).send('Ошибка при удалении отчёта.');
    }
});

app.get('/report-part-info/:id', async (req, res) => {
    try {
        const report = await ReportPartInfo.findById(req.params.id)
            .populate('group_id')
            .populate('student_ids')
            .populate('category_id')
            .populate('part_id');
        
        if (!report) {
            return res.status(404).send('Отчёт не найден.');
        }

        res.json(report);
    } catch (error) {
        console.error('Ошибка при получении отчёта:', error);
        res.status(500).send('Ошибка при получении отчёта.');
    }
});





app.get('/prob', async (req, res) => {
        // Рендеринг страницы с учителями
        res.render('probnic');
    
});


