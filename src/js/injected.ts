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
        const external: UnknownRecord = {
            usernameList: getIdleonGlobal("v"),
            database: getIdleonGlobal("d"),
            userId: getIdleonGlobal("l"),
            guildId: getIdleonGlobal("ae")
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

        const send = new CustomEvent("PassCharNameToInject", { detail: external.usernameList });
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
