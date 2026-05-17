db = db.getSiblingDB('spotify');

// Завдання 1. Топ-10 виконавців за середньою популярністю
print("--- Завдання 1: Топ-10 виконавців за середньою популярністю ---");

db.tracks.aggregate([
    // Розгортаємо масив артистів, щоб рахувати популярність для кожного окремо
    { $unwind: "$artists" },
    
    // Групуємо за іменем артиста
    {
        $group: {
            _id: "$artists",
            track_count: { $sum: 1 },
            avg_popularity: { $avg: "$popularity" }
        }
    },
    
    // Залишаємо лише тих, у кого мінімум 5 треків
    { $match: { track_count: { $gte: 5 } } },
    
    // Сортуємо за спаданням популярності
    { $sort: { avg_popularity: -1 } },
    
    // Беремо топ-10
    { $limit: 10 },
    
    // Форматуємо красивий вивід
    {
        $project: {
            _id: 0,
            artist: "$_id",
            avg_popularity: { $round: ["$avg_popularity", 1] },
            track_count: 1
        }
    }
]).forEach(printjson);

print("\n------------------------------------------------------\n");

// Завдання 2. Розподіл треків за настроєм
print("--- Завдання 2: Розподіл треків за настроєм ---");

db.tracks.aggregate([
    // Крок 1: Класифікуємо треки за допомогою $switch
    {
        $project: {
            mood: {
                $switch: {
                    branches: [
                        // Високий valence (>=0.5) + Висока energy (>=0.5) -> happy
                        { 
                            case: { $and: [
                                { $gte: ["$audio_features.valence", 0.5] }, 
                                { $gte: ["$audio_features.energy", 0.5] }
                            ]}, 
                            then: "happy" 
                        },
                        // Низький valence (<0.5) + Висока energy (>=0.5) -> angry
                        { 
                            case: { $and: [
                                { $lt: ["$audio_features.valence", 0.5] }, 
                                { $gte: ["$audio_features.energy", 0.5] }
                            ]}, 
                            then: "angry" 
                        },
                        // Високий valence (>=0.5) + Низька energy (<0.5) -> calm
                        { 
                            case: { $and: [
                                { $gte: ["$audio_features.valence", 0.5] }, 
                                { $lt: ["$audio_features.energy", 0.5] }
                            ]}, 
                            then: "calm" 
                        },
                        // Низький valence (<0.5) + Низька energy (<0.5) -> sad
                        { 
                            case: { $and: [
                                { $lt: ["$audio_features.valence", 0.5] }, 
                                { $lt: ["$audio_features.energy", 0.5] }
                            ]}, 
                            then: "sad" 
                        }
                    ],
                    default: "unknown"
                }
            }
        }
    },
    
    // Крок 2: Групуємо за знайденим настроєм і рахуємо кількість
    {
        $group: {
            _id: "$mood",
            track_count: { $sum: 1 }
        }
    },
    
    // Крок 3: Сортуємо від найпопулярнішого настрою до найменш популярного
    { $sort: { track_count: -1 } },
    
    // Крок 4: Форматуємо
    {
        $project: {
            _id: 0,
            mood: "$_id",
            track_count: 1
        }
    }
]).forEach(printjson);

print("\n------------------------------------------------------\n");

// Завдання 3. Найбільш «танцювальний» жанр
print("--- Завдання 3: Топ найбільш «танцювальних» жанрів ---");

db.tracks.aggregate([
    // Крок 1: Групуємо за жанром і рахуємо всі середні метрики
    {
        $group: {
            _id: "$track_genre",
            avg_danceability: { $avg: "$audio_features.danceability" },
            avg_energy: { $avg: "$audio_features.energy" },
            avg_valence: { $avg: "$audio_features.valence" },
            track_count: { $sum: 1 }
        }
    },
    
    // Крок 2: Відсіюємо статистично ненадійні жанри (менше 100 треків)
    { $match: { track_count: { $gte: 100 } } },
    
    // Крок 3: Сортуємо за танцювальністю за спаданням
    { $sort: { avg_danceability: -1 } },
    
    // Виводимо Топ-10 жанрів для наочності 
    // (першим буде найбільш танцювальний)
    { $limit: 10 },
    
    // Крок 4: Форматуємо результат
    {
        $project: {
            _id: 0,
            genre: "$_id",
            avg_danceability: { $round: ["$avg_danceability", 3] },
            avg_energy: { $round: ["$avg_energy", 3] },
            avg_valence: { $round: ["$avg_valence", 3] },
            track_count: 1
        }
    }
]).forEach(printjson);