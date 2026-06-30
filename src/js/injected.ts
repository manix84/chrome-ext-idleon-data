/// <reference path="../globals.d.ts" />
/** Polls Idleon's page globals until Firebase handles are available, then emits save data events. */
const queryFirebaseWithRetry = async (): Promise<void> => {
    let count = 0;
    const maxTimeout = 60;
    while (true) {
        if (count > maxTimeout) {
            console.error("Reached max timeout to check variables. Did their names change?");
            break;
        }
        await sleep(1000);

        //grab globally accessable variables from other scripts (mainly Z.js and firebase.js)
        //it is configured this way to be easy to change when the minified variable names possibly change
        const external: UnknownRecord = {
            usernameList: v,
            database: d,
            userId: l,
            guildId: ae
        }
        //verify all variables have been obtained
        let isBadData = false;
        for (const key in external) {
            if (external[key] == null || external[key] == undefined) {
                isBadData = true;
                break;
            }
        }
        if (isBadData) {
            count++;
            continue;
        };

        const send = new CustomEvent("PassCharNameToInject", { detail: external.usernameList });
        window.dispatchEvent(send);

        (external.database as FirebaseDatabase).collection("_data").doc(String(external.userId)).get().then((doc: FirebaseDocumentSnapshot) => {
            const event = new CustomEvent("PassSaveToInject", { detail: doc.data() });
            window.dispatchEvent(event);
        });

        (external.database as FirebaseDatabase).collection("_guildStat").doc(String(external.guildId)).get().then((doc: FirebaseDocumentSnapshot) => {
            const send = new CustomEvent("PassGuildInfoToInject", { detail: doc.data() });
            window.dispatchEvent(send);
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
