const cron = require('node-cron');
const axios = require('axios');
const Settings = require('../models/Settings'); // Импортируем модель Settings

// Функция для получения текущего курса доллара к тенге
const getExchangeRate = async () => {
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD'); // Используйте подходящий API для получения курса
        const rate = response.data.rates.KZT; // Получаем курс KZT (тенге)
        return rate;
    } catch (error) {
        console.error('Ошибка при получении курса валют:', error.message);
        return null; // Возвращаем null в случае ошибки
    }
};

// Задача, которая будет выполняться каждый час
cron.schedule('0 * * * *', async () => {
    console.log('Запуск задачи по обновлению цены тарифа');

    try {
        const exchangeRate = await getExchangeRate();

        if (exchangeRate) {
            // Находим текущие настройки
            const settings = await Settings.findOne();
            if (settings) {
                // Конвертируем тариф в тенге и сохраняем в поле price
                const tarifInUsd = parseFloat(settings.tarif);
                const priceInKzt = (tarifInUsd * exchangeRate).toFixed(2);

                settings.price = priceInKzt; // Обновляем поле price
                await settings.save(); // Сохраняем обновленные настройки

                console.log(`Тариф успешно обновлен: ${tarifInUsd} USD = ${priceInKzt} KZT`);
            } else {
                console.error('Настройки не найдены');
            }
        } else {
            console.error('Не удалось получить курс валют');
        }
    } catch (error) {
        console.error('Ошибка при обновлении тарифа:', error.message);
    }
});
