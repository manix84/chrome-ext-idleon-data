/// <reference path="../globals.d.ts" />
import { templateData } from "./template";
import { cardEquipMap } from "./maps/cardEquipMap";
import { cardLevelMap } from "./maps/cardLevelMap";
import { classIndexMap, classTalentMap, classTalentPageMap } from "./maps/classTalentMap";
import { itemMap } from "./maps/itemMap";
import {
    cardSetMap,
    charSubclassMap,
    classNumberMap,
    fishingBaitMap,
    fishingLineMap,
    largeBubbleMap,
    obolNameMap,
    skillIndexMap,
    starSignMap
} from "./maps/maps";
import { mobMap } from "./maps/mobMap";
import { talentMap } from "./maps/talentMap";
import { getCharacterRawField, normalizeCharacterRawData, parseJsonField, type NormalizedCharacterRawData } from "./rawData";

/** Parses raw Idleon save data into the cleaner shape used by exports and integrations. */
const parseData = (rawJson: RawIdleonData): CleanIdleonData  => {
    const r: CleanIdleonData = { account: {} as IdleonAccount, characters: [] };
    // let jsonData = JSON.parse(data);
    // let fields = rawJson.saveData.documentChange.document.fields;
    const fields = rawJson.saveData;

    const charNameData = rawJson.charNameData;

    // create each character based on blank template
    const numChars = charNameData.length;
    const characters: IdleonCharacter[] = [];
    for (let i = 0; i < numChars; i++) {
        const newCharacter = JSON.parse(JSON.stringify(templateData.characters)) as unknown as IdleonCharacter; // easy way of cloning
        newCharacter.name = charNameData[i];
        characters.push(newCharacter);
    }

    const normalizedCharacterData = normalizeCharacterRawData(fields, charNameData);
    r.characters = fillCharacterData(characters, normalizedCharacterData, fields);

    // account data
    r.account = fillAccountData(templateData.account as IdleonAccount, r.characters, fields);

    // currently left out of fillAccountData as it needs rawJson.guildInfo
    r.account.guild = fillGuildData(fields, rawJson.guildInfo);


    return r;
};

const fillGuildData = (fields: IdleonFields, guildInfo: GuildInfo | null | undefined): IdleonAccount["guild"]  => {
    const rawGuildBonuses = parseOptionalJsonField<CsvList[]>(fields.Guild, [[]]);
    return {
        bonuses: rawGuildBonuses[0],
        memberInfo: fillGuildMemberData(guildInfo)
    };
};

const fillGuildMemberData = (guildInfo: GuildInfo | null | undefined): GuildMember[]  => {
    if (guildInfo == null) {
        return [];
    }

    const guildEntries = Object.entries(guildInfo);
    const cleanMembers: GuildMember[] = [];
    for (let i = 0; i < guildEntries.length; i++) {
        const accountId = guildEntries[i][0];
        const member = guildEntries[i][1];
        cleanMembers.push({
            "name": member["a"],
            "level": member["d"],
            "guildPoints": member["e"],
            "accountId": accountId,
            "class": mapLookup(classNumberMap, String(member["c"])),
            "rank": member["g"],
            "wantedPerk": member["f"]
        });
    }
    return cleanMembers;
};

const fillAccountData = (account: IdleonAccount, characters: IdleonCharacter[], fields: IdleonFields): IdleonAccount  => {
    account.chestBank = fields.MoneyBANK.doubleValue;

    // chest
    const chestOrder = fields.ChestOrder;
    const chestQuantity = fields.ChestQuantity;
    account.chest = condenseTwoRawArrays(chestOrder, chestQuantity, "item", "count", itemMap, null, false, true);

    // obols
    const rawObolNames = fields.ObolEqO1;

    const obolNames = condenseRawArray(rawObolNames, obolNameMap);
    const obolBonusMap = parseJsonField<DynamicRecord>(fields.ObolEqMAPz1);
    account.obols = formObolData(obolNames, obolBonusMap);

    // TaskZZ0 = Current milestone in uncompleted task
    // TaskZZ1 = Completed Task Count
    // TaskZZ2 = merit shop purchases
    // TaskZZ3 = crafts unlocked
    // TaskZZ4 = total unlock points & unspent merit points
    // TaskZZ5 = current daily tasks
    const taskData = (templateData.account as IdleonAccount).tasks;
    // unlocked
    const ZZ1 = parseJsonField<DynamicValue[]>(fields.TaskZZ1);
    taskData.unlocked.world1 = ZZ1[0];
    taskData.unlocked.world2 = ZZ1[1];
    taskData.unlocked.world3 = ZZ1[2];
    // milestoneProgress
    const ZZ0 = parseJsonField<DynamicValue[]>(fields.TaskZZ0);
    taskData.milestoneProgress.world1 = ZZ0[0];
    taskData.milestoneProgress.world2 = ZZ0[1];
    taskData.milestoneProgress.world3 = ZZ0[2];
    // meritsOwned
    const ZZ2 = parseJsonField<DynamicValue[]>(fields.TaskZZ2);
    taskData.meritsOwned.world1 = ZZ2[0];
    taskData.meritsOwned.world2 = ZZ2[1];
    taskData.meritsOwned.world3 = ZZ2[2];
    // craftsUnlocked
    const ZZ3 = parseJsonField<DynamicValue[]>(fields.TaskZZ3);
    taskData.craftsUnlocked.world1 = ZZ3[0];
    taskData.craftsUnlocked.world2 = ZZ3[1];
    taskData.craftsUnlocked.world3 = ZZ3[2];
    account.tasks = taskData;

    // stamps
    const stampData = (templateData.account as IdleonAccount).stamps;
    // combat
    const combatRaw = fields.StampLv[0];
    stampData.combat = condenseRawArray(combatRaw, null, true);
    // skills
    const skillsRaw = fields.StampLv[1];
    stampData.skills = condenseRawArray(skillsRaw, null, true);
    // misc
    const miscRaw = fields.StampLv[2];
    stampData.misc = condenseRawArray(miscRaw, null, true);
    account.stamps = stampData;

    // forge
    const forgeLevelRaw = fields.ForgeLV;
    account.forge.level = condenseRawArray(forgeLevelRaw, null, true);

    // alchemy
    const alchemyData = fields.CauldronInfo;
    account.alchemy.bubbleLevels.power = condenseRawArray(alchemyData[0], null, true);
    account.alchemy.bubbleLevels.quick = condenseRawArray(alchemyData[1], null, true);
    account.alchemy.bubbleLevels.highIq = condenseRawArray(alchemyData[2], null, true);
    account.alchemy.bubbleLevels.kazam = condenseRawArray(alchemyData[3], null, true);
    account.alchemy.vialLevels = condenseRawArray(alchemyData[4], null, true);

    // highest class data
    account.highestClasses = findHighestOfEachClass(characters);

    // minigame high scores
    const minigameHighscores = fields.FamValMinigameHiscores;
    account.minigameHighscores.chopping = parseInt(minigameHighscores[0]);
    account.minigameHighscores.fishing = parseInt(minigameHighscores[1]);
    account.minigameHighscores.catching = parseInt(minigameHighscores[2]);
    account.minigameHighscores.mining = parseInt(minigameHighscores[3]);

    // highest item counts
    account.highestItemCounts["Copper Ore"] = findHighestInStorage(account.chest, "Copper Ore");
    account.highestItemCounts["Oak Logs"] = findHighestInStorage(account.chest, "Oak Logs");
    account.highestItemCounts["Grass Leaf"] = findHighestInStorage(account.chest, "Grass Leaf");

    // cards
    const rawCardsData = parseJsonField<DynamicRecord>(fields.Cards0);
    const cleanCardData: Record<string, CardData> = {};
    const cardKeys = Object.keys(rawCardsData);
    for (let i = 0; i < cardKeys.length; i++) {
        const key = cardKeys[i];
        const lookup = mapLookup(mobMap, key);
        const count = parseInt(rawCardsData[key]);
        cleanCardData[lookup] = {
            "collected": count,
            "displayName": lookup,
            "rawName": key,
            "starLevel": getStarLevelFromCard(key, count)
        };
    }
    account.cards = cleanCardData;

    // bribes
    const bribes = fields.BribeStatus;
    account.bribes = condenseRawArray(bribes, null, true);
    // TODO add map for bribe names?

    // refinery
    account.refinery = createRefineryData(fields);

    // quests complete (possibly temporary for use in spreadsheet)
    const quests: UnknownRecord = {};
    for (let i = 0; i < Object.keys(account).length; i++) {
        const questLookup = "QuestComplete_" + String(i);
        quests[questLookup] = fields[questLookup];
    }
    account.quests = quests;

    // looty mc shooty raw display
    const rawLootyString = fields.Cards1;
    // remove all quotes and []
    const lootyString = rawLootyString.replace(/"|\[|\]/g, "");
    const lootyList = lootyString.split(",");
    account.looty = lootyList;

    // purchases
    const rawBundles = parseJsonField<DynamicRecord>(fields.BundlesReceived);
    account.bundlesPurchased = parseIntMapFields(rawBundles, true);

    // anvil crafts unlocked
    // currently 0 = unlocked, -1 = locked. Might change to a better value
    const rawAnvil = parseJsonField<DynamicValue[]>(fields.AnvilCraftStatus);
    account.anvilCraftsUnlocked.tab1 = rawAnvil[0];
    account.anvilCraftsUnlocked.tab2 = rawAnvil[1];
    account.anvilCraftsUnlocked.tab3 = rawAnvil[2];

    // cogs
    const rawCogPositions = parseJsonField<DynamicRecord>(getAnyFieldValue(fields.CogO));
    const rawCogData = parseJsonField<DynamicRecord>(getAnyFieldValue(fields.CogM));
    const cogs: UnknownRecord[] = [];
    Object.keys(rawCogPositions).forEach((cogName, i) => {
        cogs.push({
            "name": rawCogPositions[cogName],
            "data": rawCogData[i] || "none"
        })
    });
    account.cogs = cogs;

    return account;
};

const createRefineryData = (fields: IdleonFields): UnknownRecord  => {
    // 0 =
    // 1 = inventory
    // 2 =
    // 3 = redox salt 
    // 3[0] = refined (unclaimed)
    // 3[1] = rank
    // 3[2] = ???
    // 3[3] = on/off 
    // 3[4] = auto-refine percent
    // 4 = explosive salt
    // 5 = spontaneity salt
    // 6 = dioxide salt
    // 7 = red salt
    // 8 = red salt 2
    const rawRefinery = parseJsonField<DynamicValue[]>(fields.Refinery);
    const refinery: UnknownRecord = {};
    refinery.salts = {};

    //this is how they are named in the template file
    const salts = ["redox", "explosive", "spontaneity", "dioxide", "red", "red2"];
    salts.forEach((salt, i) => {
        // redox starts at index 3, so it has such an offset
        const rawSalt = rawRefinery[i + 3];
        refinery.salts[salt] = {
            "refined": rawSalt[0],
            "rank": rawSalt[1],
            "state": Number(rawSalt[3]) === 1 ? "on" : "off",
            "autoPercent": rawSalt[4]
        }

        //TODO add refinery storage
    });

    return refinery;
};

// grabs information from fields and inserts it into characters and returns the filled out characters
// only fills out information based on numChars given
const fillCharacterData = (characters: IdleonCharacter[], normalizedCharacterData: NormalizedCharacterRawData[], fields: IdleonFields): IdleonCharacter[]  => {
    for (let i = 0; i < normalizedCharacterData.length; i++) {
        const characterRawData = normalizedCharacterData[i];
        const rawClassId = parseInt(getAnyFieldValue(getCharacterRawField(characterRawData, "CharacterClass")));
        characters[i].class = classIndexMap[rawClassId] ?? String(rawClassId);
        characters[i].money = parseInt(getCharacterRawField(characterRawData, "Money"));
        characters[i].AFKtarget = getCharacterRawField(characterRawData, "AFKtarget");
        characters[i].currentMap = parseInt(getAnyFieldValue(getCharacterRawField(characterRawData, "CurrentMap")));
        characters[i].npcDialogue = parseJsonField(getCharacterRawField(characterRawData, "NPCdialogue"));
        characters[i].timeAway = parseInt(getAnyFieldValue(getCharacterRawField(characterRawData, "PTimeAway")));
        characters[i].instaRevives = parseInt(getAnyFieldValue(getCharacterRawField(characterRawData, "PVInstaRevives")));
        characters[i].gender = parseInt(getAnyFieldValue(getCharacterRawField(characterRawData, "PVGender")));
        characters[i].minigamePlays = parseInt(getAnyFieldValue(getCharacterRawField(characterRawData, "PVMinigamePlays")));

        // basic stats
        const statlist = getCharacterRawField(characterRawData, "PVStatList");
        characters[i].strength = parseInt(statlist[0]);
        characters[i].agility = parseInt(statlist[1]);
        characters[i].wisdom = parseInt(statlist[2]);
        characters[i].luck = parseInt(statlist[3]);
        characters[i].level = parseInt(statlist[4]);

        // personal PO box data
        characters[i].POBoxUpgrades = parseJsonField(getCharacterRawField(characterRawData, "POu"));

        // inventory bags used
        const rawInvBagsUsed = parseJsonField<DynamicRecord>(getCharacterRawField(characterRawData, "InvBagsUsed"));
        const bags = Object.keys(rawInvBagsUsed);
        const invBagsUsed = [];
        for (let j = 0; j < bags.length; j++) {
            invBagsUsed.push({
                id: bags[j],
                name: itemMap['InvBag' + bags[j]]
            })
        }
        characters[i].invBagsUsed = invBagsUsed;

        // inventory
        const inventoryItemNames = getCharacterRawField(characterRawData, "InventoryOrder");
        const inventoryItemCounts = getCharacterRawField(characterRawData, "ItemQTY");
        characters[i].inventory = condenseTwoRawArrays(inventoryItemNames, inventoryItemCounts, "name", "count", itemMap, null, false, true);

        // equipment (0 = armor, 1 = tools, 2 = food)
        const equipableNames = getCharacterRawField(characterRawData, "EquipOrder");
        const equipableCounts = getCharacterRawField(characterRawData, "EquipQTY");

        const rawEquipmentNames = equipableNames[0];
        const rawEquipmentCounts = equipableCounts[0];
        const plainEquipmentData = condenseTwoRawArrays(rawEquipmentNames, rawEquipmentCounts, "name", "count", itemMap, null, false, true);
        // add upgrade stone data
        // IMm_# = players inventory (todo later as it isn't usefull for calculations)
        // EMm0_# = equips
        // EMm1_# = tools
        const equipmentStoneData = parseJsonField<DynamicRecord>(getCharacterRawField(characterRawData, "EMm0"));
        characters[i].equipment = addUpgradeStoneData(plainEquipmentData, equipmentStoneData);

        const rawToolNames = equipableNames[1];
        const rawToolCounts = equipableCounts[1];
        const plainToolData = condenseTwoRawArrays(rawToolNames, rawToolCounts, "name", "count", itemMap, null, false, true);
        const toolStoneData = parseJsonField<DynamicRecord>(getCharacterRawField(characterRawData, "EMm1"));
        characters[i].tools = addUpgradeStoneData(plainToolData, toolStoneData);

        const rawFoodNames = equipableNames[2];
        const rawFoodCounts = equipableCounts[2];
        characters[i].food = condenseTwoRawArrays(rawFoodNames, rawFoodCounts, "name", "count", itemMap, null, false, true);

        // obols
        const rawObols = getCharacterRawField(characterRawData, "ObolEqO0");
        const obolNames = condenseRawArray(rawObols, obolNameMap);
        const obolMap = parseJsonField<DynamicRecord>(getCharacterRawField(characterRawData, "ObolEqMAP"));
        characters[i].obols = formObolData(obolNames, obolMap);

        // statues
        const statueArray = parseJsonField<DynamicValue[]>(getCharacterRawField(characterRawData, "StatueLevels"));
        const statueItems = [];
        for (let j = 0; j < statueArray.length; j++) {
            statueItems.push({
                "level": parseInt(statueArray[j][0]),
                "progress": statueArray[j][1]
            });
        }
        characters[i].statueLevels = statueItems;

        // cards
        const cardsArray = getCharacterRawField(characterRawData, "CardEquip");
        characters[i].cardsEquip = condenseRawArray(cardsArray, cardEquipMap);

        // card set
        const rawCardSet = getCharacterRawField(characterRawData, "CSetEq");
        const defaultCardSetName = "None";
        let cardSetName = defaultCardSetName;
        if (String(rawCardSet) !== "{}") {
            cardSetName = Object.keys(parseJsonField<DynamicRecord>(rawCardSet))[0];
        }
        characters[i].cardSetEquip = cardSetMap[cardSetName];

        // skill levels
        const rawSkillLevels = getCharacterRawField(characterRawData, "Lv0");
        const unmappedSkillLevels = condenseRawArray(rawSkillLevels);
        const mappedSkillLevels: Record<string, number> = {};
        for (let j = 0; j < unmappedSkillLevels.length; j++) {
            const level = parseInt(unmappedSkillLevels[j]);
            if (level == -1) {
                continue;
            }
            mappedSkillLevels[skillIndexMap[j]] = level;
        }
        characters[i].skillLevels = mappedSkillLevels;

        // star signs
        const rawStarSignData = getCharacterRawField(characterRawData, "PVtStarSign");
        const starSignSplit = rawStarSignData.split(",");
        for (let j = 0; j < starSignSplit.length; j++) {
            starSignSplit[j] = starSignSplit[j].replace(/_/, "-1");
            if (starSignSplit[j] == "") {
                starSignSplit[j] = "-1";
            }
        }
        const starSign1 = starSignMap[parseInt(starSignSplit[0])] || "None";
        const starSign2 = starSignMap[parseInt(starSignSplit[1])] || "None";
        const starSignFinal = [starSign1, starSign2];
        characters[i].starSigns = starSignFinal;

        // talents
        const unmappedTalents = parseJsonField<DynamicRecord>(getCharacterRawField(characterRawData, "SL"));
        const unmappedTalentsKeys = Object.keys(unmappedTalents);
        const mappedTalents: Record<string, CsvValue> = {};
        // change keys to their talent name
        for (let j = 0; j < unmappedTalentsKeys.length; j++) {
            const key = unmappedTalentsKeys[j];
            mappedTalents[talentMap[parseInt(key)]] = unmappedTalents[key];
        }
        // regular talents
        const talentPages = classTalentMap[characters[i].class] ?? [];
        let orderedClassTalents: string[] = [];
        const indexedTalents: Record<string, CsvValue> = {};
        for (let j = 0; j < talentPages.length; j++) {
            const talents = classTalentPageMap[talentPages[j]];
            orderedClassTalents = orderedClassTalents.concat(talents);
        }
        for (let k = 0; k < orderedClassTalents.length; k++) {
            indexedTalents[k] = mappedTalents[orderedClassTalents[k]];
        }
        characters[i].talentLevels = indexedTalents;
        // star talents
        const starTalentList = classTalentPageMap["Star Talents"] ?? [];
        const starTalentIndexed: CsvList = [];
        for (let j = 0; j < starTalentList.length; j++) {
            if (starTalentList[j] == "FILLER") {
                starTalentIndexed.push(0);
            } else {
                const toPush = mappedTalents[starTalentList[j]];
                if (toPush == null) {
                    starTalentIndexed.push(0);
                } else {
                    starTalentIndexed.push(toPush);
                }
            }
        }
        characters[i].starTalentLevels = starTalentIndexed;

        // talent attack loadout
        const unmappedLoadoutRaw = parseJsonField<UnknownList[]>(getCharacterRawField(characterRawData, "AttackLoadout"));
        // merge them all into one array
        let unmappedLoadout: CsvList = [];
        for (let j = 0; j < unmappedLoadoutRaw.length; j++) {
            unmappedLoadout = unmappedLoadout.concat(unmappedLoadoutRaw[j]);
        }
        // change talent IDs to their in-game names
        const mappedLoadout: string[] = [];
        for (let j = 0; j < unmappedLoadout.length; j++) {
            const talentId = unmappedLoadout[j];
            if (String(talentId) === "Null") {
                continue;
            }
            mappedLoadout.push(talentMap[String(talentId)]);
        }
        // change talent names to their readable form
        for (let j = 0; j < mappedLoadout.length; j++) {
            const mappedWord = mappedLoadout[j];
            mappedLoadout[j] = mappedWord.toLowerCase().split("_").map(capitalize).join(" ");
        }
        characters[i].attackLoadout = mappedLoadout;

        // fishing toolkit
        const rawFishingToolkit = getCharacterRawField(characterRawData, "PVFishingToolkit");
        characters[i].fishingToolkitEquipped.bait = fishingBaitMap[parseInt(rawFishingToolkit[0])];
        characters[i].fishingToolkitEquipped.line = fishingLineMap[parseInt(rawFishingToolkit[1])];

        // equipped bubbles
        const charEquippedBubbles = parseJsonField<DynamicValue[]>(fields.CauldronBubbles)[i] ?? [];
        characters[i].bubblesEquipped = [
            mapLookup(largeBubbleMap, charEquippedBubbles[0]),
            mapLookup(largeBubbleMap, charEquippedBubbles[1])
        ]

        // anvil
        const rawAnvil = getCharacterRawField(characterRawData, "AnvilPA");
        // [0-13] of rawAnvil are each anvil product
        // of each product...
        // 0 = amount to be produced (claimed)
        // 1 = amount of xp gained when claimed
        // 2 = current progress? (idk need more proof but also kinda useless)
        // 3 = ???
        const anvilProducts = [];
        for (let j = 0; j < rawAnvil.length; j++) {
            const rawProductStats = rawAnvil[j];
            anvilProducts.push({
                "produced": parseInt(getAnyFieldValue(rawProductStats[0])),
                "xp": parseInt(getAnyFieldValue(rawProductStats[1]))
            });
        }
        characters[i].anvil.production = anvilProducts;
        // TODO anvil stats (data isn't very clear, might need to ask)
    }
    return characters;
};

const formObolData = (nameList: UnknownList, bonusesMap: DynamicRecord): UnknownRecord[]  => {
    const r: UnknownRecord[] = [];
    // apply all name information
    for (const name in nameList) {
        r.push({ name: nameList[name], bonus: {} });
    }

    // go through each key and add bonuses if needed
    const keys = Object.keys(bonusesMap);
    for (let i = 0; i < keys.length; i++) {
        const index = parseInt(keys[i]);
        r[index].bonus = bonusesMap[keys[i]];
    }

    return r;
};

const getStarLevelFromCard = (cardName: string, cardLevel: number): string  => {
    const base = cardLevelMap[cardName];
    const level = cardLevel;
    const oneStarReq = base;
    const twoStarReq = base * 4;
    const threeStarReq = base * 9;
    if (level == 0) {
        return "Not Found";
    } else if (level >= threeStarReq) {
        return "3 Star";
    } else if (level >= twoStarReq) {
        return "2 Star";
    } else if (level >= oneStarReq) {
        return "1 Star";
    } else {
        return "Acquired";
    }
};

const findHighestInStorage = (chestData: UnknownRecord[], itemName: string): number  => {
    let max = 0;
    for (let i = 0; i < chestData.length; i++) {
        const object = chestData[i];
        if (object.item == itemName && parseInt(object.count) > max) {
            max = parseInt(object.count);
        }
    }
    return max;
};

const findHighestOfEachClass = (characters: IdleonCharacter[]): Record<string, number>  => { // create base map of characters
    const baseCharacters: Record<string, number>[] = [];
    for (let i = 0; i < characters.length; i++) {
        const charClass = characters[i].class;
        const charLevel = parseInt(characters[i].level);
        baseCharacters.push({ [charClass]: charLevel });
        const baseChar = charSubclassMap[charClass];
        if (baseChar != null) {
            baseCharacters.push({ [baseChar]: charLevel });
        }
    }

    const map = new Map<string, number[]>();
    const uniqueClasses: string[] = [];
    for (let i = 0; i < baseCharacters.length; i++) {
        const highestClass = Object.keys(baseCharacters[i])[0];
        const highestLevel = baseCharacters[i][highestClass];
        if (map.has(highestClass)) {
            map.get(highestClass).push(highestLevel);
        } else { // create new
            const arr = [];
            arr.push(highestLevel);
            map.set(highestClass, arr);
            uniqueClasses.push(highestClass);
        }
    }

    // go through the map and pick the highest value, adding it to r
    const indexedHighestClasses: Record<string, number> = {};
    for (let i = 0; i < uniqueClasses.length; i++) {
        const addClass = uniqueClasses[i];
        const addLevel = Math.max(...map.get(addClass));
        indexedHighestClasses[addClass] = addLevel;
    }
    return indexedHighestClasses;
};

const addUpgradeStoneData = (itemList: UnknownRecord[], stoneData: DynamicRecord): UnknownRecord[]  => {
    const blankData = {
        "Defence": 0,
        "WIS": 0,
        "STR": 0,
        "LUK": 0,
        "Weapon_Power": 0,
        "AGI": 0,
        "Reach": 0,
        "Upgrade_Slots_Left": 0,
        "Power": 0,
        "Speed": 0,
        "UQ1val": 0
    }

    // add blank data to everything in the list first
    for (let i = 0; i < itemList.length; i++) {
        itemList[i]["stoneData"] = blankData;
    }

    // go through stone data and add any that need to be added
    const keys = Object.keys(stoneData);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        // (hacky fix) some weapon power is stored as "Weapon_Power" instead of "Power"
        // if that happens, just add "Power" with the same value
        if (Object.keys(stoneData[key]).includes("Weapon_Power")) {
            stoneData[key]["Power"] = stoneData[key]["Weapon_Power"];
        }

        itemList[parseInt(key)]["stoneData"] = stoneData[key];
    }
    return itemList;
};

// some lists are stored as maps. This function turns them into actual lists
const turnMapToList = (map: DynamicRecord, toInt = false): UnknownList  => {
    const r: UnknownList = [];
    for (const key in Object.keys(map)) {
        if (toInt) {
            r.push(parseInt(key));
        } else {
            r.push(key);
        }
    }
    return r;
};

// forces each field of a map to be an integer or null
const parseIntMapFields = (map: DynamicRecord, _toInt = true): Record<string, number>  => {
    const r: Record<string, number> = {};
    const keys = Object.keys(map);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        r[key] = parseInt(map[key]);
    }
    return r;
};

const parseOptionalJsonField = <T>(value: unknown, fallback: T): T => {
    if (value === null || value === undefined || value === "") {
        return fallback;
    }

    try {
        return parseJsonField<T>(value);
    } catch {
        return fallback;
    }
};

// take two raw arrays and get the first (and only) mapped object from each element in the array and combine it with
// the second specified array in the same manner, but in a new array of maps with fields specified with field1 and field2
// an optional toInt1 and toInt2 can be specified to ensure field data is an integer
const condenseTwoRawArrays = (raw1: DynamicValue, raw2: DynamicValue, field1: string, field2: string, map1: StringMap | null = null, map2: StringMap | null = null, toInt1 = false, toInt2 = false): UnknownRecord[]  => {
    const r: UnknownRecord[] = [];
    let length = raw1.length;
    if (length == undefined) {
        length = raw1.length;
    }
    for (let i = 0; i < length; i++) {
        const element1 = raw1[i];
        const element2 = raw2[i];
        let val1: CsvValue = element1;
        let val2: CsvValue = element2;
        if (map1 != null) {
            val1 = mapLookup(map1, val1);
        }
        if (map2 != null) {
            val2 = mapLookup(map2, val2);
        }
        if (toInt1) {
            val1 = parseInt(val1);
        }
        if (toInt2) {
            val2 = parseInt(val2);
        }
        const condensedItem: UnknownRecord = { [field1]: val1, [field2]: val2 };
        if (map1 != null) {
            condensedItem["raw" + capitalize(field1)] = element1;
        }
        if (map2 != null) {
            condensedItem["raw" + capitalize(field2)] = element2;
        }
        r.push(condensedItem);
    }
    return r;
};

const condenseRawArray = (rawArray: DynamicValue, map: StringMap | null = null, toInt = false): UnknownList  => {
    const r: UnknownList = [];
    let length = rawArray.length;
    if (length == undefined) {
        length = rawArray.length;
    }
    for (let i = 0; i < length; i++) {
        const element = rawArray[i];
        let val: CsvValue = element;
        if (map != null) {
            val = mapLookup(map, val);
        }
        if (toInt) {
            val = parseInt(val);
        }
        r.push(val);
    }
    return r;
};

// look up an item in a specified map. Useful to find unmapped items easily
const mapLookup = (map: StringMap, key: unknown): string  => {
    const lookupKey = String(key);
    const r = map[lookupKey];
    if (r == undefined) {
        // console.error("Unable to find key: " + key + " in map");
        return lookupKey;
    }
    return r;
};

// gets the first value of a given field
const getAnyFieldValue = (field: unknown): unknown  => {
    // return String(field[Object.keys(field)[0]]);
    return field;
};

const capitalize = (str: string): string  => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export { parseData };
