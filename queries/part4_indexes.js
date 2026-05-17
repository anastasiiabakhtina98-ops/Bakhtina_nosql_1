db = db.getSiblingDB('spotify');

// Завдання 1. Аналіз запиту та індексація
print("--- Завдання 1: Аналіз запиту та індексація ---\n");

// Очистимо старі індекси (крім _id), щоб експеримент був чистим
db.tracks.dropIndexes();

const queryTask1 = {
    track_genre: "pop",
    "audio_features.danceability": { $gte: 0.7 }
};
const sortTask1 = { popularity: -1 };

// Крок 1: Аналіз плану без індексу
print("1. Аналіз запиту БЕЗ індексу:");
const explainNoIndex = db.tracks.find(queryTask1).sort(sortTask1).explain("executionStats");
const rootStageTask1 = explainNoIndex.executionStats.executionStages.stage;
const childStageTask1 = explainNoIndex.executionStats.executionStages.inputStage ? explainNoIndex.executionStats.executionStages.inputStage.stage : "";
print(`- Головна стадія: ${rootStageTask1} (Сортування в пам'яті)`);
print(`- Вкладена стадія читання: ${childStageTask1} (Повне сканування всіх документів)`);
print(`- Документів перевірено (totalDocsExamined): ${explainNoIndex.executionStats.totalDocsExamined}`);
print(`- Час виконання: ${explainNoIndex.executionStats.executionTimeMillis} мс\n`);

// Крок 2: Створення індексу (За правилом ESR: Equality, Sort, Range)
db.tracks.createIndex({
    track_genre: 1,
    popularity: -1,
    "audio_features.danceability": 1
});

// Крок 3: Аналіз плану з індексом
print("3. Аналіз запиту З індексом:");
const explainWithIndex = db.tracks.find(queryTask1).sort(sortTask1).explain("executionStats");

// Оскільки структура winningPlan може містити FETCH, звертаємось до вкладеного inputStage
const winningStage = explainWithIndex.executionStats.executionStages.inputStage 
    ? explainWithIndex.executionStats.executionStages.inputStage.stage 
    : explainWithIndex.executionStats.executionStages.stage;

print(`- Стадія виконання: ${winningStage} (Означає пошук по індексу)`);
print(`- Документів перевірено (totalDocsExamined): ${explainWithIndex.executionStats.totalDocsExamined}`);
print(`- Час виконання: ${explainWithIndex.executionStats.executionTimeMillis} мс`);

print("------------------------------------------------------\n");

// Завдання 2. Індекс для інших полів
print("--- Завдання 2: Індекс для фонової музики ---\n");

// Крок 1: Створення індексу
// Тут 'explicit' йде першим, бо це булеве поле (Equality), далі йдуть поля діапазонів
db.tracks.createIndex({
    explicit: 1,
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1
});

// Крок 2: Аналіз використання індексу
const backgroundQuery = {
    explicit: false,
    "audio_features.instrumentalness": { $gt: 0.5 },
    "audio_features.speechiness": { $lt: 0.1 }
};

const explainBackground = db.tracks.find(backgroundQuery).explain("executionStats");
const isUsingIxscan = JSON.stringify(explainBackground.queryPlanner.winningPlan).includes("IXSCAN");

print(`- Чи використовує база новий індекс? ${isUsingIxscan ? "ТАК" : "НІ"}`);
print(`- Документів перевірено: ${explainBackground.executionStats.totalDocsExamined}`);

