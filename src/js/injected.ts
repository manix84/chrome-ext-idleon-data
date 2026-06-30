/// <reference path="../globals.d.ts" />
import { logError, logInfo, logVerbose, setDebugLevel } from "./debug";

const currentScript = document.currentScript as HTMLScriptElement | null;
setDebugLevel(currentScript?.dataset.debugLevel);

const dispatchStatus = (status: CaptureStatusUpdate): void => {
    const logDetails: UnknownRecord = {
        stage: status.stage,
        attempt: status.attempt,
        missingKeys: status.missingKeys,
    };
    if (status.stage === "firebase-polling") {
        logVerbose(status.message, logDetails);
    } else {
        logInfo(status.message, logDetails);
    }
    window.dispatchEvent(new CustomEvent("IdleonApiDownloaderStatus", { detail: status }));
};

window.addEventListener(
    "IdleonApiDownloaderDebugLevelChanged",
    (event) => {
        const debugLevel = setDebugLevel((event as CustomEvent<DebugLogLevel>).detail);
        logInfo("Injected script debug level changed.", { debugLevel });
    },
    false
);

const getIdleonGlobal = (key: string): unknown => {
    return (globalThis as UnknownRecord)[key];
};

const getReactBridge = (): IdleonReactBridge | null => {
    const reactValue = getIdleonGlobal("React");
    if (typeof reactValue !== "object" || reactValue === null) {
        return null;
    }

    const candidate = reactValue as Partial<IdleonReactBridge>;
    if (typeof candidate.createElement === "function") {
        return candidate as IdleonReactBridge;
    }

    return null;
};

const getStringValue = (value: unknown): string | null => {
    if (typeof value === "string" && value.length > 0) {
        return value;
    }

    return null;
};

const getUsernameList = (): string[] | null => {
    const globalUsernameList = getIdleonGlobal("v");
    if (Array.isArray(globalUsernameList) && globalUsernameList.every((value) => typeof value === "string")) {
        return globalUsernameList;
    }

    const reactBridge = getReactBridge();
    if (!reactBridge) {
        return null;
    }

    try {
        const bridgedUsernameList = reactBridge.createElement("getUserNameList", []);
        if (Array.isArray(bridgedUsernameList) && bridgedUsernameList.every((value) => typeof value === "string")) {
            return bridgedUsernameList;
        }
    } catch (error: unknown) {
        logError("Failed to read character names from Idleon bridge.", error);
    }

    return null;
};

const isFirestoreDatabase = (value: unknown): value is FirebaseDatabase => {
    return typeof value === "object" &&
        value !== null &&
        typeof (value as { collection?: unknown }).collection === "function";
};

const getFirebaseNamespace = (): FirebaseNamespace | null => {
    const firebaseValue = getIdleonGlobal("firebase");
    if (typeof firebaseValue !== "object" || firebaseValue === null) {
        return null;
    }

    const candidate = firebaseValue as Partial<FirebaseNamespace>;
    if (
        typeof candidate.auth === "function" &&
        typeof candidate.database === "function" &&
        typeof candidate.firestore === "function"
    ) {
        return candidate as FirebaseNamespace;
    }

    return null;
};

const getFirestoreDatabase = (): FirebaseDatabase | null => {
    const globalDatabase = getIdleonGlobal("d");
    if (isFirestoreDatabase(globalDatabase)) {
        return globalDatabase;
    }

    const firebaseNamespace = getFirebaseNamespace();
    if (!firebaseNamespace) {
        return null;
    }

    try {
        return firebaseNamespace.firestore();
    } catch (error: unknown) {
        logError("Failed to read Firestore from Firebase namespace.", error);
        return null;
    }
};

const getUserId = (): string | null => {
    const globalUserId = getStringValue(getIdleonGlobal("l"));
    if (globalUserId) {
        return globalUserId;
    }

    const firebaseNamespace = getFirebaseNamespace();
    if (!firebaseNamespace) {
        return null;
    }

    try {
        return getStringValue(firebaseNamespace.auth().currentUser?.uid);
    } catch (error: unknown) {
        logError("Failed to read current Firebase auth user.", error);
        return null;
    }
};

const getGuildId = async (userId: string | null): Promise<string | null> => {
    const globalGuildId = getStringValue(getIdleonGlobal("ae"));
    if (globalGuildId) {
        return globalGuildId;
    }

    if (!userId) {
        return null;
    }

    const firebaseNamespace = getFirebaseNamespace();
    if (!firebaseNamespace) {
        return null;
    }

    try {
        const snapshot = await firebaseNamespace
            .database()
            .ref()
            .child("_usgu")
            .child(userId)
            .child("g")
            .once("value");
        return getStringValue(snapshot.val());
    } catch (error: unknown) {
        logError("Failed to read guild id from Firebase realtime database.", error);
        return null;
    }
};

const getMissingKeys = (external: UnknownRecord): string[] => {
    return Object.keys(external).filter((key) => external[key] === null || external[key] === undefined);
};

/** Polls Idleon's page globals until Firebase handles are available, then emits save data events. */
const queryFirebaseWithRetry = async (): Promise<void> => {
    let count = 0;
    const maxTimeout = 60;
    dispatchStatus({
        stage: "firebase-polling",
        message: "Looking for Idleon Firebase globals.",
        attempt: count,
    });

    while (true) {
        if (count > maxTimeout) {
            const message = "Timed out waiting for Idleon Firebase globals. The game may still be loading, or its variable names may have changed.";
            logError(message);
            dispatchStatus({
                stage: "timeout",
                message,
                attempt: count,
            });
            break;
        }
        await sleep(1000);

        //grab globally accessable variables from other scripts (mainly Z.js and firebase.js)
        //it is configured this way to be easy to change when the minified variable names possibly change
        const userId = getUserId();
        const guildId = await getGuildId(userId);
        const usernameList = getUsernameList();
        const external: UnknownRecord = {
            charNameData: usernameList,
            database: getFirestoreDatabase(),
            userId,
            guildId,
        }
        //verify all variables have been obtained
        const missingKeys = getMissingKeys(external);
        if (missingKeys.length > 0) {
            count++;
            dispatchStatus({
                stage: "firebase-polling",
                message: `Waiting for Idleon Firebase globals: ${missingKeys.join(", ")}.`,
                attempt: count,
                missingKeys,
            });
            continue;
        };

        dispatchStatus({
            stage: "firebase-globals-found",
            message: "Idleon Firebase globals found. Requesting save data.",
            attempt: count,
        });

        const send = new CustomEvent("PassCharNameToInject", { detail: external.charNameData });
        window.dispatchEvent(send);

        const database = external.database as FirebaseDatabase;
        dispatchStatus({
            stage: "save-data-requested",
            message: "Requesting account save data from Idleon.",
        });
        database.collection("_data").doc(String(external.userId)).get()
            .then((doc: FirebaseDocumentSnapshot) => {
                const event = new CustomEvent("PassSaveToInject", { detail: doc.data() });
                window.dispatchEvent(event);
            })
            .catch((error: unknown) => {
                logError("Failed to fetch Idleon save data.", error);
                dispatchStatus({
                    stage: "error",
                    message: "Failed to fetch Idleon save data.",
                    errorMessage: error instanceof Error ? error.message : String(error),
                });
            });

        dispatchStatus({
            stage: "guild-info-requested",
            message: "Requesting guild info from Idleon.",
        });
        database.collection("_guildStat").doc(String(external.guildId)).get()
            .then((doc: FirebaseDocumentSnapshot) => {
                const send = new CustomEvent("PassGuildInfoToInject", { detail: doc.data() });
                window.dispatchEvent(send);
            })
            .catch((error: unknown) => {
                logError("Failed to fetch Idleon guild info.", error);
                dispatchStatus({
                    stage: "error",
                    message: "Failed to fetch Idleon guild info.",
                    errorMessage: error instanceof Error ? error.message : String(error),
                });
            });

        //TESTING - This is a lot of data so it shouldn't be grabbed every time...
        //maybe make this data be grabbed when a button is clicked?
        // r.child(Ge).once("value", function(dataSnapshot){
        //     try{
        //         console.log(dataSnapshot.exportVal()[0]);
        //     }catch(e){
        //         //ignore
        //     }
        // });

        break;
    }
};

const sleep = (ms: number): Promise<void>  => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

queryFirebaseWithRetry();
