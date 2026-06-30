/// <reference path="../globals.d.ts" />
/** Parses clean save data into a tab-separated guild member export. */
const guildExportCsv = (cleanJson: CleanIdleonData): string  => {
    const memberInfo = cleanJson.account.guild.memberInfo;
    const separator = "\t";
    let r = "";
    for (let i = 0; i < memberInfo.length; i++) {
        const member = memberInfo[i];
        // TODO clean this mess up... it works tho
        r += member.accountId + separator + member.rank + separator + member.name + separator + member.class + separator + member.level + separator + member.wantedPerk + separator + member.guildPoints + "\n";
    }
    return r;
};
