// 基础数据接口
export interface BaseData {
  no: number;
}

// 关卡数据接口
export interface Stage extends BaseData {
  area_no: number;
  stage_no: number;
  stage_type: number;
  level_type?: number;
  exp: number;
  item_drop_group_no?: number;
  item_no_1?: number;
  amount_1?: number;
  item_no_2?: number;
  amount_2?: number;
  item_no_3?: number;
  amount_3?: number;
  item_no_4?: number;
  amount_4?: number;
  item_no_5?: number;
  amount_5?: number;
  item_no_6?: number;
  amount_6?: number;
  item_no_7?: number;
  amount_7?: number;
  item_no_8?: number;
  amount_8?: number;
  item_no_9?: number;
  amount_9?: number;
}

// 战斗队伍数据接口
export interface StageBattle extends BaseData {
  team_no: number;
  formation_type: number;
  hero_no_1?: number;
  hero_grade_1?: number;
  level_1?: number;
  hero_no_2?: number;
  hero_grade_2?: number;
  level_2?: number;
  hero_no_3?: number;
  hero_grade_3?: number;
  level_3?: number;
  hero_no_4?: number;
  hero_grade_4?: number;
  level_4?: number;
  hero_no_5?: number;
  hero_grade_5?: number;
  level_5?: number;
}

// 字符串数据接口
export interface StringData extends BaseData {
  zh_tw: string;
  zh_cn: string;
  kr: string;
  en: string;
  ja: string;
}

// 物品数据接口
export interface Item extends BaseData {
  grade: number;
  type: number;
  category: number;
  name_sno?: number;
}

// 物品掉落组数据结构
export interface ItemDropGroup extends BaseData {
  item_no: number;
  amount: number;
  drop_rate: number;  // 修正字段名：应该是 drop_rate 不是 rate
}

// 英雄数据接口
export interface Hero extends BaseData {
  grade: number;
  race: number;
  element: number;
  class: number;
  name_sno?: number;
}

// 阵型数据接口
export interface Formation extends BaseData {
  type: number;
}

// 现金商店包数据接口
export interface CashShopItem extends BaseData {
  category: number;
  type: string;
  type_value?: string;
  related_stage_no?: number;
  name_sno?: number;
  item_info_sno?: number;
  desc_sno?: number;
  limit_buy?: number;
  limit_hour?: number;
  item_infos?: string;
  price_krw?: number;
  price_other?: number;
}

// 数据源类型
export type DataSource = 'live' | 'review';

// 键值对数据接口
export interface KeyValue extends BaseData {
  key_name: string;
  values_data: string;
}

// 英雄品质数据接口
export interface HeroGrade extends BaseData {
  name_sno: number;
  hero_grade_value: number;
}

// 英雄等级品质数据接口
export interface HeroLevelGrade extends BaseData {
  level: number;
  value: number;
}

// 游戏数据集合接口
export interface GameData {
  stage: { json: Stage[] };
  stage_battle: { json: StageBattle[] };
  string_system: { json: StringData[] };
  string_item: { json: StringData[] };
  string_character: { json: StringData[] };
  string_cashshop: { json: StringData[] };
  string_ui: { json: StringData[] };
  item: { json: Item[] };
  item_drop_group: { json: ItemDropGroup[] };
  hero: { json: Hero[] };
  formation: { json: Formation[] };
  cash_shop_item: { json: CashShopItem[] };
  key_values: { json: KeyValue[] };
  hero_grade: { json: HeroGrade[] };
  hero_level_grade: { json: HeroLevelGrade[] };
}

// 掉落物品信息
export interface DropItemInfo {
  item_name: StringData;
  amount: number;
  rate: number;
}

// 英雄位置信息
export interface HeroPosition {
  position: number;
  hero_no: number;
  grade: number;
  level: number;
}

// 战斗队伍信息
export interface BattleTeamInfo {
  team_no: number;
  formation_type: string;
  heroes: Array<{
    position: number;
    name: string;
    grade: string;
    level: number;
  }>;
  battle_power?: number;
}

// 关卡详细信息
export interface StageDetails {
  area_no: number;
  stage_no: number;
  level_type: string;
  exp: number;
  fixed_items: Array<{
    name: string;
    amount: number;
  }>;
  battle_teams: BattleTeamInfo[];
  drop_items: DropItemInfo[];
  cash_packs: string[];
} 