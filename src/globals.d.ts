interface ChromeStorageArea {
  get(keys: string | string[], callback: (result: UnknownRecord) => void): void;
  set(items: UnknownRecord, callback?: () => void): void;
}

interface ChromeApi {
  runtime: {
    getURL(path: string): string;
  };
  storage: {
    local: ChromeStorageArea;
    onChanged: {
      addListener(callback: (changes: UnknownRecord, namespace: string) => void): void;
    };
  };
}

interface FirebaseDocumentSnapshot {
  data(): UnknownRecord;
}

interface FirebaseDocumentReference {
  get(): Promise<FirebaseDocumentSnapshot>;
}

interface FirebaseCollectionReference {
  doc(id: string): FirebaseDocumentReference;
}

interface FirebaseDatabase {
  collection(name: string): FirebaseCollectionReference;
}

interface FirebaseAuthUser {
  uid: string;
}

interface FirebaseAuth {
  currentUser: FirebaseAuthUser | null;
}

interface FirebaseDataSnapshot {
  val(): unknown;
}

interface FirebaseRealtimeReference {
  child(path: string): FirebaseRealtimeReference;
  once(eventName: "value"): Promise<FirebaseDataSnapshot>;
}

interface FirebaseRealtimeDatabase {
  ref(): FirebaseRealtimeReference;
}

interface FirebaseNamespace {
  auth(): FirebaseAuth;
  database(): FirebaseRealtimeDatabase;
  firestore(): FirebaseDatabase;
}

declare const chrome: ChromeApi;

declare const firebase: FirebaseNamespace;
declare const v: string[];
declare const d: FirebaseDatabase;
declare const l: string;
declare const ae: string;

type UnknownRecord = Record<string, unknown>;
type UnknownList = unknown[];
interface DynamicValue extends UnknownRecord {
  [index: number]: DynamicValue;
  doubleValue: number;
  length: number;
  replace(searchValue: string | RegExp, replaceValue: string): string;
  split(separator: string | RegExp): string[];
}
type DynamicRecord = Record<string | number, DynamicValue>;
type CsvValue = unknown;
type CsvList = CsvValue[];
type StringMap = Record<string | number, string>;
type NumberMap = Record<string | number, number>;
type StringListMap = Record<string, string[]>;
type IndexedRecord<T> = Record<string | number, T> | T[];
type IdleonFields = DynamicRecord;
type GuildInfo = Record<string, DynamicRecord>;

interface RawIdleonData extends UnknownRecord {
  saveData: IdleonFields;
  charNameData: string[];
  guildInfo: GuildInfo;
}

interface GuildMember {
  accountId: string;
  class: string;
  guildPoints: unknown;
  level: unknown;
  name: unknown;
  rank: unknown;
  wantedPerk: unknown;
}

interface CardData extends UnknownRecord {
  collected: number;
  starLevel: string;
}

interface EquippedItem extends UnknownRecord {
  count?: CsvValue;
  name?: CsvValue;
  stoneData?: UnknownRecord;
}

interface NamedEntry extends UnknownRecord {
  name?: CsvValue;
}

interface IdleonCharacter extends UnknownRecord {
  alchemy: UnknownRecord;
  anvil: UnknownRecord;
  attackLoadout: CsvList;
  cardSetEquip: CsvValue;
  cardSet: UnknownRecord;
  cardsEquip: CsvList;
  class?: string;
  food: IndexedRecord<{
    count?: CsvValue;
    name?: CsvValue;
  }>;
  equipment: IndexedRecord<EquippedItem>;
  fishingToolkitEquipped: {
    bait?: CsvValue;
    line?: CsvValue;
  };
  fishing?: {
    bait?: unknown;
    line?: unknown;
  };
  inventory: IndexedRecord<UnknownRecord>;
  level?: string | number;
  obols: IndexedRecord<NamedEntry>;
  skills: UnknownRecord;
  skillLevels: Record<string, CsvValue>;
  starSigns: CsvList;
  starTalentLevels: CsvList;
  statueLevels: IndexedRecord<{
    level?: CsvValue;
  }>;
  storage: IndexedRecord<UnknownRecord>;
  talentLevels: IndexedRecord<CsvValue>;
  talents: UnknownRecord;
  tools: IndexedRecord<EquippedItem>;
  traps: UnknownList;
}

interface IdleonAccount extends UnknownRecord {
  alchemy: {
    bubbleLevels: Record<string, UnknownList>;
    vialLevels: UnknownList;
  };
  anvilCraftsUnlocked: {
    tab1?: CsvValue;
    tab2?: CsvValue;
    tab3?: CsvValue;
  };
  bribes: UnknownList;
  cards: Record<string, CardData>;
  chest: UnknownRecord[];
  cogs: UnknownRecord[];
  forge: {
    level: UnknownList;
  };
  guild: {
    bonuses: CsvList;
    memberInfo: GuildMember[];
  };
  highestClasses: Record<string, number>;
  highestItemCounts: Record<string, number>;
  minigameHighscores: Record<string, number>;
  obols: IndexedRecord<NamedEntry>;
  stamps: {
    combat: UnknownList;
    skills: UnknownList;
    misc: UnknownList;
  };
  tasks: UnknownRecord & {
    craftsUnlocked: UnknownRecord;
    meritsOwned: UnknownRecord;
    milestoneProgress: UnknownRecord;
    unlocked: UnknownRecord;
  };
}

interface CleanIdleonData extends UnknownRecord {
  account: IdleonAccount;
  characters: IdleonCharacter[];
}

type CaptureStatusStage =
  | "content-script-loaded"
  | "injected-script-loading"
  | "injected-script-loaded"
  | "firebase-polling"
  | "firebase-globals-found"
  | "char-names-captured"
  | "save-data-requested"
  | "save-data-captured"
  | "guild-info-requested"
  | "guild-info-captured"
  | "partial-data"
  | "data-ready"
  | "timeout"
  | "error"
  | "cache-cleared";

type DebugLogLevel = "off" | "info" | "verbose";

interface CaptureStatus extends UnknownRecord {
  stage: CaptureStatusStage;
  message: string;
  updatedAt: number;
  attempt?: number;
  missingKeys?: string[];
  receivedKeys?: string[];
  errorMessage?: string;
}

interface CaptureStatusUpdate extends UnknownRecord {
  stage: CaptureStatusStage;
  message: string;
  attempt?: number;
  missingKeys?: string[];
  receivedKeys?: string[];
  errorMessage?: string;
}

interface JSON {
  parse(text: unknown, reviver?: (this: unknown, key: string, value: unknown) => unknown): DynamicValue;
  parse(text: DynamicValue, reviver?: (this: unknown, key: string, value: unknown) => unknown): DynamicValue;
}

declare function parseInt(string: unknown, radix?: number): number;
declare function parseInt(string: DynamicValue, radix?: number): number;
