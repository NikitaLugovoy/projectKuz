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
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Group', 
        required: false, 
    }
}, {
    timestamps: true
});

const Teacher = mongoose.model('teachers', teacherSchema);

const hbs = require('hbs');
app.set('views', 'views');
app.set('view engine', 'hbs');

app.use(express.static("static"));

hbs.registerHelper('eq', function (a, b) {
    return a === b;
});

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
            return res.redirect('/'); 
        } else if (teacher._id.toString() === "670f9154f104962ab0ef8c07") {
            res.redirect(`/menu/${teacher._id}`)
        } else {
            return res.redirect(`/menuTeach/${teacher._id}`); 
        }
    } catch (error) {
        console.error('Ошибка при выполнении запроса к базе данных:', error);
        res.status(500).send('Произошла ошибка при выполнении запроса к базе данных');
    }
});

app.get(`/menu/:teacherId`, async (req, res) =>{
    let teacherId = req.params.teacherId;
    res.render(`menu`, { teacherId })
})

app.get('/menuTeach/:teacherId', async (req, res) => {
    let teacherId = req.params.teacherId;
    res.render('menuTeach', { teacherId });  
});

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

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, 
        unique: true,   
    }
}, {
    timestamps: true 
});

const Group = mongoose.model('Group', groupSchema);

app.get('/groups/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }

        const groups = await Group.find();

        res.render('group', { groups, teacherId });
    } catch (error) {
        console.error('Ошибка при получении групп:', error);
        res.status(500).send('Ошибка при получении групп');
    }
});

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
        required: true, 
    },
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student' 
    }
});

let Achievement = mongoose.model('Achievement', achievementSchema);

app.get('/achievements/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }

        const achievements = await Achievement.find().populate('student_id');

        res.render('achievements', {
            achievements,
            students: await Student.find(), 
            teacherId 
        });
    } catch (error) {
        console.error('Ошибка при получении достижений:', error);
        res.status(500).send('Ошибка при получении достижений');
    }
});

app.post('/achievements', async (req, res) => {
    const { achievement_details, student_id } = req.body; 

    const newAchievement = new Achievement({
        achievement_details,
        student_id 
    });

    try {
        const savedAchievement = await newAchievement.save();
        await savedAchievement.populate('student_id'); 
        res.status(201).json(savedAchievement);
    } catch (error) {
        console.error('Ошибка при добавлении достижения:', error);
        res.status(500).send('Ошибка при добавлении достижения');
    }
});

app.put('/achievements/:id', async (req, res) => {
    const achievementId = req.params.id;
    const { achievement_details, student_id } = req.body; 

    try {
        const updatedAchievement = await Achievement.findByIdAndUpdate(
            achievementId,
            { achievement_details, student_id }, 
            { new: true, runValidators: true } 
        ).populate('student_id'); 

        if (!updatedAchievement) {
            return res.status(404).send('Достижение не найдено.');
        }
        res.status(200).json(updatedAchievement); 
    } catch (error) {
        console.error('Ошибка при редактировании достижения:', error);
        res.status(500).send('Ошибка при редактировании достижения');
    }
});

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

let studentSchema = new mongoose.Schema({
    username: String,
    phone_number: String,
    email: String,
    additional_info: String,
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group' 
    }
});

let Student = mongoose.model('Student', studentSchema);

app.get('/students/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }

        const students = await Student.find().populate('group_id');

        const groups = await Group.find();

        res.render('student', {
            students,
            groups,
            groups2: groups, 
            teacherId 
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
        const populatedStudent = await Student.findById(savedStudent._id).populate('group_id'); 
        res.status(201).json(populatedStudent); 
    } catch (error) {
        console.error('Error adding student:', error);
        res.status(500).json({ error: 'Error adding student' });
    }
});

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
        res.redirect('/students'); 
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
            group_id 
        }, { new: true }).populate('group_id'); 

        res.json(updatedStudent); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при обновлении данных студента.');
    }
});

app.delete('/students/:id', async (req, res) => {
    const studentId = req.params.id;
    try {
        await Student.findByIdAndDelete(studentId);
        res.status(204).send(); 
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).send(error);
    }
});

app.get('/teachers/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }
        const teachers = await Teacher.find().populate('group_id'); 
        const groups = await Group.find(); 
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
        const populatedTeacher = await Teacher.findById(savedTeacher._id).populate('group_id'); 
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
        ).populate('group_id'); 

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

app.get('/teachers/:teacherId/account', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const teacher = await Teacher.findById(teacherId).populate('group_id');
        if (!teacher) {
            return res.status(404).send('Учитель не найден.');
        }
        const groups = await Group.find();

        res.render('account', { teacher, groups });
    } catch (error) {
        console.error('Ошибка при получении данных учителя:', error);
        res.status(500).send('Ошибка при загрузке страницы профиля.');
    }
});

let publicActivitySchema = new mongoose.Schema({
    participation_details: {
        type: String,
        required: true 
    },
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student' 
    },
    has_pushkin_card: {
        type: Boolean,
        required: true 
    }
});

let PublicActivity = mongoose.model('PublicActivity', publicActivitySchema);

app.get('/publicactivities/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }
        const publicActivities = await PublicActivity.find().populate('student_id'); 
        res.render('publicactivities', { publicActivities, students: await Student.find() }); 
    } catch (error) {
        console.error('Ошибка при получении публичных активностей:', error);
        res.status(500).send('Ошибка при получении публичных активностей');
    }
});

app.post('/publicactivities', async (req, res) => {
    const { participation_details, student_id, has_pushkin_card } = req.body; 

    const newPublicActivity = new PublicActivity({
        participation_details,
        student_id, 
        has_pushkin_card 
    });

    try {
        const savedPublicActivity = await newPublicActivity.save();
        await savedPublicActivity.populate('student_id'); 
        res.status(201).json(savedPublicActivity);
    } catch (error) {
        console.error('Ошибка при добавлении публичной активности:', error);
        res.status(500).send('Ошибка при добавлении публичной активности');
    }
});

app.put('/publicactivities/:id', async (req, res) => {
    const publicActivityId = req.params.id;
    const { participation_details, student_id, has_pushkin_card } = req.body; 

    try {
        const updatedPublicActivity = await PublicActivity.findByIdAndUpdate(
            publicActivityId,
            { participation_details, student_id, has_pushkin_card }, 
            { new: true, runValidators: true } 
        ).populate('student_id'); 

        if (!updatedPublicActivity) {
            return res.status(404).send('Публичная активность не найдена.');
        }
        res.status(200).json(updatedPublicActivity); 
    } catch (error) {
        console.error('Ошибка при редактировании публичной активности:', error);
        res.status(500).send('Ошибка при редактировании публичной активности');
    }
});

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

let categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true 
    }
});

let Category = mongoose.model('Category', categorySchema);

app.get('/categories/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }
        const categories = await Category.find();
        res.render('categories', {
            categories,
            teacherId 
        });
    } catch (error) {
        console.error('Ошибка при получении категорий:', error);
        res.status(500).send('Ошибка при получении категорий');
    }
});

app.post('/categories', async (req, res) => {
    const { name } = req.body; 

    const newCategory = new Category({
        name 
    });

    try {
        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory); 
    } catch (error) {
        console.error('Ошибка при добавлении категории:', error);
        res.status(500).send('Ошибка при добавлении категории');
    }
});

app.put('/categories/:id', async (req, res) => {
    const categoryId = req.params.id;
    const { name } = req.body; 

    try {
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { name }, 
            { new: true, runValidators: true } 
        );

        if (!updatedCategory) {
            return res.status(404).send('Категория не найдена.');
        }

        res.status(200).json(updatedCategory); 
    } catch (error) {
        console.error('Ошибка при редактировании категории:', error);
        res.status(500).send('Ошибка при редактировании категории');
    }
});

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

const partSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true, 
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        required: false, 
    }
}, {
    timestamps: true 
});

const Part = mongoose.model('Part', partSchema);

app.get('/parts/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }

        const parts = await Part.find().populate('category_id'); 
        const categories = await Category.find(); 

        res.render('parts', { parts, categories, teacherId });
    } catch (error) {
        console.error('Ошибка при получении частей:', error);
        res.status(500).send('Ошибка при получении частей');
    }
});

app.post('/parts', async (req, res) => {
    const { title, category_id } = req.body; 

    const newPart = new Part({
        title,
        category_id
    });

    try {
        const savedPart = await newPart.save(); 
        const populatedPart = await Part.findById(savedPart._id).populate('category_id'); 
        res.status(201).json(populatedPart); 
    } catch (error) {
        console.error('Ошибка при добавлении части:', error);
        res.status(500).send('Ошибка при добавлении части');
    }
});

app.put('/parts/:id', async (req, res) => {
    const partId = req.params.id; 
    const { title, category_id } = req.body; 

    try {
        const updatedPart = await Part.findByIdAndUpdate(
            partId,
            { title, category_id }, 
            { new: true } 
        ).populate('category_id'); 

        if (!updatedPart) {
            return res.status(404).send('Часть не найдена.');
        }

        res.status(200).json(updatedPart); 
    } catch (error) {
        console.error('Ошибка при редактировании части:', error);
        res.status(500).send('Ошибка при редактировании части');
    }
});

app.delete('/parts/:id', async (req, res) => {
    const partId = req.params.id; 

    try {
        const deletedPart = await Part.findByIdAndDelete(partId); 
        if (!deletedPart) {
            return res.status(404).send('Часть не найдена.');
        }
        res.status(200).send('Часть успешно удалена.'); 
    } catch (error) {
        console.error('Ошибка при удалении части:', error);
        res.status(500).send('Ошибка при удалении части.');
    }
});

const reportPartInfoSchema = new mongoose.Schema({
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group', 
        required: true 
    },
    student_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student', 
        required: true 
    }],
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', 
        required: true 
    },
    part_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Part', 
        required: true 
    },
    date: {
        type: Date,
        required: true 
    },
    photo: {
        type: String, 
        required: false 
    },
    details: {
        type: String, 
        required: false 
    }
}, {
    timestamps: true 
});

const ReportPartInfo = mongoose.model('ReportPartInfo', reportPartInfoSchema);

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
        const students = await Student.find({ group_id: groupId }); 
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

app.get('/report-part-in/:id', async (req, res) => {
    try {
        const report = await ReportPartInfo.findById(req.params.id)
            .populate('group_id')
            .populate('student_ids')
            .populate('category_id')
            .populate('part_id');

        if (!report) {
            return res.status(404).send('Отчёт не найден.');
        }
        console.log(report); 
        res.json(report);
    } catch (error) {
        console.error('Ошибка при получении отчёта:', error);
        res.status(500).send('Ошибка при получении отчёта.');
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

app.get('/prob', async (req, res) => {
        res.render('probnic');
});

app.get('/account/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const teacher = await Teacher.findById(teacherId).populate('group_id');
        if (!teacher) {
            return res.status(404).send('Преподаватель не найден');
        }

        const groups = await Group.find();

        res.render('account', { teacher, groups });
    } catch (error) {
        console.error('Ошибка при получении данных преподавателя:', error);
        res.status(500).send('Ошибка при получении данных преподавателя');
    }
});

app.put('/editTeacher/:id', async (req, res) => {
    const teacherId = req.params.id;
    const { full_name, login, password, group_id } = req.body;

    try {
        const updateData = {
            full_name,
            login,
            group_id,
        };

        if (password) {
            updateData.password = password; 
        }

        const updatedTeacher = await Teacher.findByIdAndUpdate(
            teacherId,
            updateData,
            { new: true, runValidators: true } 
        ).populate('group_id'); 

        if (!updatedTeacher) {
            return res.status(404).send('Преподаватель не найден.');
        }

        res.redirect(`/teachers/${updatedTeacher._id}/account`);
    } catch (error) {
        console.error('Ошибка при обновлении данных учителя:', error);
        res.status(500).send('Ошибка при обновлении данных учителя');
    }
});

app.get('/editTeacher/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const teacher = await Teacher.findById(teacherId).populate('group_id');
        if (!teacher) {
            return res.status(404).send('Учитель не найден.');
        }

        const groups = await Group.find();

        res.render('edit-teacher', { teacher, groups });
    } catch (error) {
        console.error('Ошибка при получении данных учителя для редактирования:', error);
        res.status(500).send('Ошибка при загрузке страницы редактирования.');
    }
});

app.post('/editTeacher/:id', async (req, res) => {
    const teacherId = req.params.id;
    const { full_name, login, password, group_id } = req.body;

    try {
        const updateData = {
            full_name,
            login,
            group_id,
        };

        if (password) {
            updateData.password = password; 
        }

        const updatedTeacher = await Teacher.findByIdAndUpdate(
            teacherId,
            updateData,
            { new: true, runValidators: true } 
        ).populate('group_id'); 

        if (!updatedTeacher) {
            return res.status(404).send('Преподаватель не найден.');
        }

        res.redirect(`/account/${updatedTeacher._id}`);
    } catch (error) {
        console.error('Ошибка при обновлении данных учителя:', error);
        res.status(500).send('Ошибка при обновлении данных учителя');
    }
});