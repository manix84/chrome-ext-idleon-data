/// <reference path="../globals.d.ts" />
/** Converts clean save data into the partial format expected by Idleon Companion. */
const companionParseData = (cleanData: CleanIdleonData): UnknownRecord  => {
    const r: UnknownRecord = {};
    r.alchemy = {};

    r.cards = parseCompanionCards(cleanData);

    r.chars = [];
    r.checklist = {};
    r.starSigns = {};
    r.tasks = {};
    r.version = "0.2.3"; // unsure if this should be hardcoded
    return r;
};

const parseCompanionCards = (clean: CleanIdleonData): UnknownRecord  => {
    const r: UnknownRecord = {};
    const rawCards = clean.account.cards;
    for (const cardName in rawCards) {
        // TODO this should probably be changed to use underscores in clean parse,
        // but I'm too lazy right now to do so..
        console.log(cardName);
        const newKey = cardName.replace(" ", "_");
        r[newKey] = parseInt(rawCards[cardName].collected);
    }
    console.log(r);
    return r;
};
