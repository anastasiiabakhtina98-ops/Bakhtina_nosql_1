db = db.getSiblingDB('spotify');

// Завдання 1. Треки для вечірки
print("--- Завдання 1: Пошук треків для вечірки (перші 3 для прикладу) ---");

const partyTracks = db.tracks.find({
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    duration_ms: { $gte: 180000, $lte: 300000 }
}).limit(3);

partyTracks.forEach(printjson);
print("\n------------------------------------------------------\n");

// Завдання 2. Виконавці, у яких усі треки популярні
print("--- Завдання 2: Топ-20 популярних артистів ---");

db.tracks.aggregate([
    // Оскільки artists — це масив, розгортаємо його для поштучного аналізу
    { $unwind: "$artists" },
    
    // Групуємо за іменем артиста та рахуємо метрики
    {
        $group: {
            _id: "$artists",
            total_tracks: { $sum: 1 },
            min_popularity: { $min: "$popularity" },
            avg_popularity: { $avg: "$popularity" }
        }
    },
    
    // Фільтруємо за умовою: мінімум 3 треки і мінімальна популярність >= 60
    {
        $match: {
            total_tracks: { $gte: 3 },
            min_popularity: { $gte: 60 }
        }
    },
    
    // Сортуємо за середньою популярністю (від найвищої)
    { $sort: { avg_popularity: -1 } },
    
    // Обмежуємо до топ-20
    { $limit: 20 },
    
    // Форматуємо вивід та округлюємо середню популярність
    {
        $project: {
            _id: 0,
            artist_name: "$_id",
            total_tracks: 1,
            min_popularity: 1,
            avg_popularity: { $round: ["$avg_popularity", 1] }
        }
    }
]).forEach(printjson);

print("\n------------------------------------------------------\n");

// Завдання 3. Нетипові треки (Outliers за темпом у розрізі жанрів)
print("--- Завдання 3: Нетипові треки за темпом (outliers) ---");

db.tracks.aggregate([
    // Крок 1: Групуємо за жанром, рахуємо середнє, стандартне відхилення 
    // та накопичуємо базову інформацію про треки в масив для економії пам'яті
    {
        $group: {
            _id: "$track_genre",
            avg_tempo: { $avg: "$audio_features.tempo" },
            std_dev: { $stdDevPop: "$audio_features.tempo" },
            tracks: {
                $push: {
                    _id: "$_id",
                    track_name: "$track_name",
                    popularity: "$popularity",
                    artists: "$artists",
                    tempo: "$audio_features.tempo"
                }
            }
        }
    },
    
    // Крок 2: Обчислюємо поріг аномальності для кожного жанру (mean + 2 * stdDev)
    {
        $addFields: {
            outlier_threshold: { 
                $add: ["$avg_tempo", { $multiply: [2, "$std_dev"] }] 
            }
        }
    },
    
    // Крок 3: Фільтруємо масив треків, залишаючи тільки ті, де tempo > поріг
    {
        $project: {
            _id: 0,
            genre: "$_id",
            avg_tempo: { $round: ["$avg_tempo", 1] },
            outlier_threshold: { $round: ["$outlier_threshold", 1] },
            outlier_tracks: {
                $filter: {
                    input: "$tracks",
                    as: "track",
                    cond: { $gt: ["$$track.tempo", "$outlier_threshold"] }
                }
            }
        }
    },
    
    // Крок 4: Мапимо відфільтровані треки до точної структури
    {
        $project: {
            genre: 1,
            avg_tempo: 1,
            outlier_threshold: 1,
            outlier_tracks: {
                $map: {
                    input: "$outlier_tracks",
                    as: "ot",
                    in: {
                        _id: "$$ot._id",
                        track_name: "$$ot.track_name",
                        popularity: "$$ot.popularity",
                        artists: "$$ot.artists",
                        audio_features: {
                            tempo: "$$ot.tempo"
                        }
                    }
                }
            }
        }
    },
    // Обмежимо вивід до 1 жанру для демонстрації структури у консолі
    { $limit: 1 }
]).forEach(printjson);

print("\n------------------------------------------------------\n");

// Завдання 4: Треки для фонової роботи
print("--- Завдання 4: Треки для фонової роботи (перші 3 для прикладу) ---");

const backgroundTracks = db.tracks.find({
    "audio_features.loudness": { $lt: -10 },
    "audio_features.speechiness": { $lt: 0.1 },
    "audio_features.instrumentalness": { $gt: 0.5 },
    explicit: false
}).limit(3);

backgroundTracks.forEach(printjson);