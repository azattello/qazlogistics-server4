const Track = require('../models/Track');
const Settings = require('../models/Settings');

const updateTrack = async (req, res, next) => {
    try {
        const { track, status, date, weight, place } = req.body;

        // Получаем текущие настройки для получения цены и валюты
        const settings = await Settings.findOne();
        const pricePerUnit = parseFloat(settings.price);
        const currency = settings.currency;

        // Рассчитываем общую стоимость
        const totalPrice = weight ? (parseFloat(weight) * pricePerUnit).toFixed(2) : null;

        // Проверяем, существует ли трек с переданным номером
        let existingTrack = await Track.findOne({ track });

        // Создаем дату и время для истории
        const selectedDate = date ? new Date(date) : new Date();
        const currentTime = new Date();
        selectedDate.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());

        if (!existingTrack) {
            // Если трек не существует, создаем новую запись
            const newTrack = new Track({
                track,
                status,
                weight,
                place,
                currency,
                price: totalPrice,
                history: [{ status, date: selectedDate }]
            });
            // Сохраняем новый трек
            await newTrack.save();
            return res.status(201).json({ message: 'Новая запись трека успешно создана' });
        } else {
            // Если трек существует, обновляем его данные
            existingTrack.status = status;

            // Обновляем вес, цену и валюту только если они переданы
            if (weight) {
                existingTrack.weight = weight;
                existingTrack.price = totalPrice;
            }

            // Если `place` не было передано, оставляем текущее значение
            if (place) {
                existingTrack.place = existingTrack.place || place;
            }

            existingTrack.currency = existingTrack.currency || currency;

            // Добавляем новую запись в историю с текущей датой и временем
            existingTrack.history.push({ status, date: selectedDate });

            // Сохраняем обновленный трек
            await existingTrack.save();

            return res.status(200).json({ message: 'Данные трека успешно обновлены' });
        }

    } catch (error) {
        console.error('Ошибка при обновлении или создании трека:', error);
        return res.status(500).json({ message: 'Произошла ошибка при обновлении или создании трека' });
        next(error);
    }
};


const excelTrack = async (req, res, next) => {
    try {
        const { tracks, status, date } = req.body;

        // Получаем список уже существующих треков
        const existingTracks = await Track.find({ track: { $in: tracks } });

        // Создаем дату и время для истории
        const selectedDate = date ? new Date(date) : new Date();
        const currentTime = new Date();
        selectedDate.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());

        // Разделяем массив треков на существующие и новые
        const existingTrackNumbers = existingTracks.map(track => track.track);
        const newTracksData = tracks.filter(track => !existingTrackNumbers.includes(track))
            .map(track => ({
                track,
                status,
                history: [{ status, date: selectedDate }]
            }));

        // Обновляем данные существующих треков
        await Track.updateMany({ track: { $in: existingTrackNumbers } }, {
            $set: { status },
            $push: { history: { status, date: selectedDate } }
        });

        // Добавляем новые треки
        if (newTracksData.length > 0) {
            await Track.insertMany(newTracksData);
        }
        
        return res.status(200).json({ message: 'Данные треков успешно обновлены или созданы' });

    } catch (error) {
        console.error('Ошибка при обновлении или создании треков:', error);
        return res.status(500).json({ message: 'Произошла ошибка при обновлении или создании треков' });
        next(error);
    }
};




module.exports = { updateTrack, excelTrack};
