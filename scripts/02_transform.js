db = db.getSiblingDB('spotify');

// 1. Створити нову колекцію tracks (видаляємо стару, якщо існує)
if (db.getCollectionNames().includes("tracks")) {
    db.tracks.drop();
    print("Стару колекцію 'tracks' видалено.");
}

// Запускаємо конвеєр агрегації на колекції tracks_raw
db.tracks_raw.aggregate([
    {
        $addFields: {
            // Перейменовуємо оригінальне поле для відповідності умові 
            // (в CSV воно називається 'artists')
            artists_raw: "$artists",

            // 3. Перетворення артистів: розбиваємо по ';' та прибираємо пробіли
            artists: {
                $map: {
                    input: { $split: [{ $toString: "$artists" }, ";"] },
                    as: "artist",
                    in: { $trim: { input: "$$artist" } }
                }
            },
            
            // 4. Формування аудіо-характеристик у вкладений об'єкт
            audio_features: {
                danceability: "$danceability",
                energy: "$energy",
                loudness: "$loudness",
                speechiness: "$speechiness",
                acousticness: "$acousticness",
                instrumentalness: "$instrumentalness",
                liveness: "$liveness",
                valence: "$valence",
                tempo: "$tempo",
                key: "$key",
                mode: "$mode",
                time_signature: "$time_signature"
            },
            
            // 4. Додаємо duration_sec (округлення до 1 знака)
            duration_sec: {
                $round: [{ $divide: ["$duration_ms", 1000] }, 1]
            },
            
            // 4. Додаємо popularity_tier за допомогою $switch
            popularity_tier: {
                $switch: {
                    branches: [
                        { case: { $gte: ["$popularity", 70] }, then: "high" },
                        { case: { $gte: ["$popularity", 40] }, then: "medium" }
                    ],
                    default: "low" // все, що менше 40
                }
            }
        }
    },
    {
        // 2 та 5. Проєкція полів: залишаємо лише потрібне і очищуємо зайве.
        $project: {
            _id: 1, 
            track_id: 1,
            track_name: 1,
            album_name: 1,
            explicit: 1,
            popularity: 1,
            duration_ms: 1,
            track_genre: 1,
            artists: 1,           // новий масив
            audio_features: 1,    // новий об'єкт
            duration_sec: 1,      // обчислене поле
            popularity_tier: 1    // обчислене поле
        }
    },
    {
        // 6. Збереження результату у колекцію tracks
        $out: "tracks"
    }
]);

print("Трансформація завершена успішно!");

// 7. Перевірка результату
const count = db.tracks.countDocuments({});
print(`\nКількість документів у колекції 'tracks': ${count}`);

print("\nПриклад документа (перевірка структури):");
const sampleDoc = db.tracks.findOne();
printjson(sampleDoc);