const Alexa = require('ask-sdk');
const moment = require('moment');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to Cake Time. What is your birth date?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CaptureBirthdayIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureBirthdayIntent';
    },
    async handle(handlerInput) {

        const attributesManager = handlerInput.attributesManager;

        const localDay = Alexa.getSlotValue(handlerInput.requestEnvelope, 'day');
        const localYear = Alexa.getSlotValue(handlerInput.requestEnvelope, 'year');

        const localMonthSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'month');

        // const localMonthName = localMonthSlot.value;
        const localMonthName = localMonthSlot.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        const localMonthID = localMonthSlot.resolutions.resolutionsPerAuthority[0].values[0].value.id;

        let birthdayData = getBirthdayData(localDay, localMonthID, localYear);
        console.log(birthdayData);

        let speakOutput = `Now I know your birth date. It is ${localDay} ${localMonthName} ${localYear}.`;

        if (birthdayData.daysUntilBirthday == 0) {
            speakOutput += ` Woohoo! Today is your ${birthdayData.age}th birthday.`;
        }
        else {
            speakOutput += ` You are ${birthdayData.age} years old. There are ${birthdayData.daysUntilBirthday} days left until your next birthday.`;
        }

        // Save these to DB
        let birthdayAttributes = {
            "year": localYear,
            "month": localMonthID,
            "monthName": localMonthName,
            "day": localDay
        };

        attributesManager.setPersistentAttributes(birthdayAttributes);
        await attributesManager.savePersistentAttributes();

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

function getBirthdayData(day, month, year) {
    const today = moment().startOf('day');
    const wasBorn = moment(`${month}/${day}/${year}`, "MM/DD/YYYY").startOf('day');
    const nextBirthday = moment(`${month}/${day}/${today.year()}`, "MM/DD/YYYY").startOf('day');
    if (today.isAfter(nextBirthday)) {
        nextBirthday.add(1, 'years');
    }
    const age = today.diff(wasBorn, 'years');
    const daysAlive = today.diff(wasBorn, 'days');
    const daysUntilBirthday = nextBirthday.startOf('day').diff(today, 'days'); // same day returns 0

    return {
        daysAlive: daysAlive, // not used but nice to have :)
        daysUntilBirthday: daysUntilBirthday,
        age: age //in years
    }
}

exports.handler = Alexa.SkillBuilders.standard()
    .addRequestHandlers(
        LaunchRequestHandler,
        CaptureBirthdayIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .withTableName('CakeTime')
    .withAutoCreateTable(true)
    .lambda();