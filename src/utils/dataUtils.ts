import {
  GameData,
  DataSource,
  StringData,
  DropItemInfo,
  BattleTeamInfo,
  StageDetails,
  Stage,
  StageBattle
} from '@/types';

// GitHub 数据获取基础 URL
const GITHUB_BASE_URL = 'https://edgeone.gh-proxy.com/raw.githubusercontent.com/PackageInstaller/DataTable/master/EverSoul/MasterData/Global';

// 缓存配置
const CACHE_CONFIG = {
  enableMemoryCache: true, // 启用内存缓存作为二级缓存
  enableDatabaseCache: true, // 启用数据库缓存
  maxMemoryCacheSize: 50, // 增加内存缓存大小补偿
  cacheExpiryHours: 2 // 缓存过期时间（小时）
};

// 全局内存缓存（作为二级缓存，提高性能）
declare global {
  var __appCache: {
    dataCache: Map<string, any>;
    cacheHitCount: number;
    cacheMissCount: number;
    dbHitCount: number;
    initialized: boolean;
  } | undefined;
}

// 初始化内存缓存
function initializeMemoryCache() {
  if (global.__appCache && global.__appCache.initialized) {
    return;
  }
  
  console.log('🚀 [DataUtils] 初始化内存缓存');
  global.__appCache = {
    dataCache: new Map<string, any>(),
    cacheHitCount: 0,
    cacheMissCount: 0,
    dbHitCount: 0,
    initialized: true
  };
}

// 立即初始化内存缓存
initializeMemoryCache();

// 阵型类型映射（参考 Python 配置）
const FORMATION_TYPE_MAPPING: { [key: number]: string } = {
  1: "基本阵型",
  2: "狙击型", 
  3: "防守阵型",
  4: "突击型"
};

// 调试日志函数
function debugLog(message: string, data?: any) {
  console.log(`[DataUtils] ${message}`, data || '');
}

/**
 * 从文件缓存获取数据
 */
async function getCachedDataFromFile(dataSource: DataSource, fileName: string): Promise<any | null> {
  if (!CACHE_CONFIG.enableDatabaseCache || typeof window === 'undefined') return null;
  
  const startTime = Date.now();
  try {
    const baseUrl = window.location.origin;
    const cacheEntry = await fetch(`${baseUrl}/api/cache/get/${dataSource}/${fileName}`);
    
    if (!cacheEntry.ok) {
      if (cacheEntry.status === 404) {
        console.log(`💭 [FileCache] 缓存不存在: ${dataSource}/${fileName}`);
      }
      return null;
    }
    
    const data = await cacheEntry.json();
    if (!data || !data.isValid) {
      return null;
    }
    
    // 检查缓存是否过期
    const expiryTime = new Date(data.fetchedAt);
    expiryTime.setHours(expiryTime.getHours() + CACHE_CONFIG.cacheExpiryHours);
    
    if (new Date() > expiryTime) {
      console.log(`⏰ [FileCache] 缓存已过期: ${dataSource}/${fileName}`);
      return null;
    }
    
    const elapsed = Date.now() - startTime;
    global.__appCache!.dbHitCount++;
    console.log(`✅ [FileCache] 缓存命中: ${dataSource}/${fileName} (${elapsed}ms, 累计命中: ${global.__appCache!.dbHitCount})`);
    
    return JSON.parse(data.data);
  } catch (error) {
    console.error(`❌ [FileCache] 读取失败: ${dataSource}/${fileName}`, error);
    return null;
  }
}

/**
 * 将数据保存到数据库缓存
 */
async function saveCachedDataToDB(dataSource: DataSource, fileName: string, data: any): Promise<void> {
  if (!CACHE_CONFIG.enableDatabaseCache || typeof window === 'undefined') return;
  
  try {
    const baseUrl = window.location.origin;
    await fetch(`${baseUrl}/api/cache/save/${dataSource}/${fileName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: JSON.stringify(data), fetchedAt: new Date(), isValid: true })
    });
    
    debugLog(`💾 数据已保存到数据库缓存: ${dataSource}/${fileName}`);
  } catch (error) {
    debugLog(`数据库缓存保存失败: ${dataSource}/${fileName}`, error);
  }
}

/**
 * 从 GitHub 获取 JSON 数据（使用文件缓存 + 内存缓存）
 */
export async function fetchJsonFromGitHub(dataSource: DataSource, fileName: string): Promise<any> {
  initializeMemoryCache();
  
  const cacheKey = `${dataSource}-${fileName}`;
  
  console.log(`🔍 [DataUtils] 尝试获取数据: ${fileName} (数据源: ${dataSource})`);
  
  // 1. 检查内存缓存
  if (CACHE_CONFIG.enableMemoryCache && global.__appCache!.dataCache.has(cacheKey)) {
    global.__appCache!.cacheHitCount++;
    console.log(`⚡ [MemCache] 命中: ${fileName} (累计: ${global.__appCache!.cacheHitCount})`);
    return global.__appCache!.dataCache.get(cacheKey);
  }
  
  // 2. 检查文件缓存
  const fileData = await getCachedDataFromFile(dataSource, fileName);
  if (fileData) {
    // 将文件缓存加载到内存缓存
    if (CACHE_CONFIG.enableMemoryCache) {
      global.__appCache!.dataCache.set(cacheKey, fileData);
      manageMemoryCacheSize();
    }
    return fileData;
  }
  
  // 3. 从GitHub下载数据
  global.__appCache!.cacheMissCount++;
  const networkStartTime = Date.now();
  console.log(`🌐 [Download] 缓存未命中，开始下载: ${fileName} (累计未命中: ${global.__appCache!.cacheMissCount})`);

  try {
    const url = `${GITHUB_BASE_URL}/${dataSource}/${fileName}.json`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EverSoul-Strategy-Web/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    let data = JSON.parse(text);
    
    // 检查数据结构
    if (data && typeof data === 'object' && data.json && Array.isArray(data.json)) {
      data = data.json;
    }
    
    const networkElapsed = Date.now() - networkStartTime;
    console.log(`✅ [Download] 完成: ${fileName} (${networkElapsed}ms, ${(text.length / 1024).toFixed(2)} KB)`);
    
    // 保存到内存缓存
    if (CACHE_CONFIG.enableMemoryCache) {
      global.__appCache!.dataCache.set(cacheKey, data);
      manageMemoryCacheSize();
    }
    
    // 异步保存到文件缓存
    saveCachedDataToDB(dataSource, fileName, data).catch(err => {
      console.error('异步保存文件缓存失败:', err);
    });
    
    return data;
  } catch (error) {
    console.error(`❌ [Download] 失败: ${fileName}`, error);
    throw error;
  }
}

/**
 * 加载完整的游戏数据
 */
export async function loadGameData(dataSource: DataSource): Promise<GameData> {
  debugLog(`开始加载完整游戏数据，数据源: ${dataSource}`);
  
  const dataFiles = [
    'Stage',
    'StageBattle', 
    'StringSystem',
    'StringItem',
    'StringCharacter',
    'StringCashshop',
    'StringUI',
    'Item',
    'ItemDropGroup',
    'Hero',
    'Formation',
    'CashShopItem',
    'KeyValues',
    'HeroGrade',
    'HeroLevelGrade'
  ];

  debugLog(`需要加载 ${dataFiles.length} 个数据文件`, dataFiles);

  try {
    const promises = dataFiles.map(file => fetchJsonFromGitHub(dataSource, file));
    const results = await Promise.all(promises);
    
    debugLog(`所有数据文件加载完成`);
    
    // 验证每个结果
    results.forEach((result, index) => {
      const fileName = dataFiles[index];
      if (Array.isArray(result)) {
        debugLog(`${fileName}: 数组，包含 ${result.length} 项`);
      } else {
        debugLog(`${fileName}: ${typeof result}`, result);
      }
    });

    const gameData = {
      stage: { json: results[0] },
      stage_battle: { json: results[1] },
      string_system: { json: results[2] },
      string_item: { json: results[3] },
      string_character: { json: results[4] },
      string_cashshop: { json: results[5] },
      string_ui: { json: results[6] },
      item: { json: results[7] },
      item_drop_group: { json: results[8] },
      hero: { json: results[9] },
      formation: { json: results[10] },
      cash_shop_item: { json: results[11] },
      key_values: { json: results[12] },
      hero_grade: { json: results[13] },
      hero_level_grade: { json: results[14] }
    };
    
    debugLog(`游戏数据结构构建完成`);
    return gameData;
  } catch (error) {
    debugLog(`加载游戏数据失败`, error);
    throw error;
  }
}

/**
 * 获取字符串数据 - 根据类型和编号（严格按照 Python 实现）
 */
export function getStringByType(data: GameData, stringType: string, no: number): StringData {
  const defaultString = { no, zh_tw: "", zh_cn: "", kr: "", en: "", ja: "", ko: "" };
  
  const jsonKey = `string_${stringType}`;
  
  // 检查数据是否存在
  const gameDataKey = jsonKey as keyof GameData;
  if (!data[gameDataKey]) {
    debugLog(`未找到数据类型: ${jsonKey}`);
    return defaultString;
  }

  const stringData = (data[gameDataKey] as any).json;
  const result = stringData.find((item: any) => item.no === no);
  
  if (!result) {
    debugLog(`未找到字符串数据: type=${stringType}, no=${no}`);
    return defaultString;
  }
  
  debugLog(`找到字符串数据: type=${stringType}, no=${no}, zh_tw=${result.zh_tw}`);
  return {
    no: result.no,
    zh_tw: result.zh_tw || "",
    zh_cn: result.zh_cn || "",
    kr: result.kr || "",
    en: result.en || "",
    ja: result.ja || "",
    ko: result.ko || ""
  };
}

/**
 * 获取物品字符串信息（严格按照 Python 实现）
 */
export function getStringItem(data: GameData, itemNo: number): StringData {
  debugLog(`查找物品: ${itemNo}`);
  
  // 在 Item.json 中查找物品
  for (const item of data.item.json) {
    if (item.no === itemNo) {
      const nameSno = item.name_sno;
      debugLog(`找到物品 ${itemNo}，name_sno: ${nameSno}`);
      
      if (nameSno) {
        // 在 StringItem.json 中查找物品名称
        for (const string of data.string_item.json) {
          if (string.no === nameSno) {
            debugLog(`找到物品名称: ${string.zh_tw}`);
            return {
              no: string.no,
              zh_tw: string.zh_tw || "",
              zh_cn: string.zh_cn || "",
              kr: string.kr || "",
              en: string.en || "",
              ja: string.ja || "",
              ko: string.ko || ""
            };
          }
        }
      }
    }
  }
  
  debugLog(`未找到物品: ${itemNo}`);
  return { no: itemNo, zh_tw: "", zh_cn: "", kr: "", en: "", ja: "", ko: "" };
}

/**
 * 获取角色字符串信息（严格按照 Python 实现）
 */
export function getStringCharacter(data: GameData, heroNo: number, special: boolean = false): StringData {
  let nameSno = heroNo;
  
  debugLog(`查找角色: ${heroNo}, special: ${special}`);
  
  if (special) {
    // 在角色模式下，先找到 hero_no 对应的 name_sno
    for (const hero of data.hero.json) {
      if (hero.no === heroNo) {
        nameSno = hero.name_sno || heroNo;
        debugLog(`找到角色 ${heroNo}，name_sno: ${nameSno}`);
        break;
      }
    }
  }
  
  // 根据 name_sno 查找对应的文本
  for (const char of data.string_character.json) {
    if (char.no === nameSno) {
      debugLog(`找到角色名称: ${char.zh_tw}`);
      return {
        no: char.no,
        zh_tw: char.zh_tw || "",
        zh_cn: char.zh_cn || "",
        kr: char.kr || "",
        en: char.en || "",
        ja: char.ja || "",
        ko: char.ko || ""
      };
    }
  }
  
  debugLog(`未找到角色: ${heroNo}`);
  return { no: heroNo, zh_tw: "", zh_cn: "", kr: "", en: "", ja: "", ko: "" };
}

/**
 * 获取阵型类型名称（按照 Python 实现）
 */
export function getFormationType(formationType: number): string {
  const result = FORMATION_TYPE_MAPPING[formationType] || "";
  debugLog(`阵型类型 ${formationType}: ${result}`);
  return result;
}

/**
 * 获取基础战斗力（完全按照Python实现）
 */
export function getBaseBattlePower(data: GameData, entityType: number, level: number): number {
  try {
    let typePrefix = "";
    if (entityType === 1) {
      typePrefix = "BP_hero";
    } else if (entityType === 2) {
      typePrefix = "BP_monster";
    } else if (entityType === 3) {
      typePrefix = "BP_raid";
    } else {
      debugLog(`未知的实体类型: ${entityType}`);
      return 0;
    }

    let baseValue = 0.0;
    let levelValue = 0.0;
    let levelPerValue = 0.0;

    for (const kv of data.key_values.json) {
      const keyName = kv.key_name || "";
      
      if (keyName === `${typePrefix}_base`) {
        try {
          baseValue = parseFloat(kv.values_data || "0");
        } catch {
          baseValue = 0.0;
        }
      } else if (keyName === `${typePrefix}_level`) {
        try {
          levelValue = parseFloat(kv.values_data || "0");
        } catch {
          levelValue = 0.0;
        }
      } else if (keyName === `${typePrefix}_level_per`) {
        try {
          levelPerValue = parseFloat(kv.values_data || "0");
        } catch {
          levelPerValue = 0.0;
        }
      }
    }

    const battlePower = Math.floor(baseValue + (levelValue + levelPerValue * level) * (level - 1));
    debugLog(`基础战力计算: base=${baseValue}, level=${levelValue}, levelPer=${levelPerValue}, level=${level} => ${battlePower}`);
    return battlePower;
  } catch (error) {
    debugLog(`计算基础战力时发生错误: ${error}`);
    return 0;
  }
}

/**
 * 获取英雄品质加成值（完全按照Python实现）
 */
export function getHeroGradeValue(data: GameData, grade: number): number {
  try {
    for (const gradeInfo of data.hero_grade.json) {
      if (gradeInfo.name_sno === grade) {
        const value = gradeInfo.hero_grade_value || 0.85;
        debugLog(`品质加成: grade=${grade} => ${value}`);
        return value;
      }
    }
    debugLog(`品质加成: grade=${grade} => 0.85 (默认值)`);
    return 0.85;
  } catch (error) {
    debugLog(`获取角色品质加成值时发生错误: ${error}`);
    return 0.85;
  }
}

/**
 * 获取英雄等级加成值（完全按照Python实现）
 */
export function getHeroLevelGradeValue(data: GameData, level: number): number {
  try {
    let levelGradeValue = 1.0;
    const levelGrades = [...data.hero_level_grade.json];
    levelGrades.sort((a, b) => (a.level || 0) - (b.level || 0));

    for (const gradeData of levelGrades) {
      if ((gradeData.level || 0) <= level) {
        levelGradeValue = gradeData.value || 1.0;
      } else {
        break;
      }
    }

    const maxLevelData = levelGrades.reduce((max, current) => 
      (current.level || 0) > (max.level || 0) ? current : max, levelGrades[0]);
    
    if (level >= (maxLevelData.level || 0)) {
      levelGradeValue = maxLevelData.value || 1.0;
    }

    debugLog(`等级加成: level=${level} => ${levelGradeValue}`);
    return levelGradeValue;
  } catch (error) {
    debugLog(`获取角色等级加成率时发生错误: ${error}`);
    return 1.0;
  }
}

/**
 * 计算战斗力（完全按照Python实现）
 */
export function calculateBattlePower(
  data: GameData, 
  entityType: number, 
  level: number, 
  grade: number,
  equipmentPower: number = 0,
  equipmentPowerPer: number = 0.0,
  signaturePowerPer: number = 0.0,
  contentsBuffPower: number = 0.0,
  contentsBuffPowerPer: number = 0.0
): number {
  try {
    const basePower = getBaseBattlePower(data, entityType, level);
    const gradeValue = getHeroGradeValue(data, grade);
    const levelGradeValue = getHeroLevelGradeValue(data, level);
    
    const totalPower = (
      basePower +
      (levelGradeValue - 1.0) * basePower +
      (gradeValue - 1.0) * basePower +
      equipmentPower +
      equipmentPowerPer * basePower +
      signaturePowerPer * basePower +
      contentsBuffPower +
      contentsBuffPowerPer * basePower
    );

    if (totalPower === Infinity) {
      return 0;
    }
    
    const result = Math.floor(totalPower);
    debugLog(`总战力: base=${basePower}, gradeValue=${gradeValue}, levelGradeValue=${levelGradeValue} => ${result}`);
    return result;
  } catch (error) {
    debugLog(`计算总战力时发生错误: ${error}`);
    return 0;
  }
}

/**
 * 获取掉落物品概率信息（严格按照 Python 实现）
 */
export function getDropItemRate(data: GameData, groupNo?: number): DropItemInfo[] {
  debugLog(`查找掉落组: ${groupNo}`);
  
  if (groupNo == null) {
    return [];
  }

  const dropItems: DropItemInfo[] = [];

  // 查找掉落组数据
  for (const dropGroup of data.item_drop_group.json) {
    if (dropGroup.no === groupNo) {
      const itemNo = dropGroup.item_no;
      const value = dropGroup.amount || 0;
      const dropRate = dropGroup.drop_rate || 0;  // 修正：使用 drop_rate 字段
      
      debugLog(`找到掉落数据: item=${itemNo}, amount=${value}, drop_rate=${dropRate}`);
      
      if (itemNo) {
        const itemName = getStringItem(data, itemNo);
        // 转换掉落率 (1000 = 1%)
        const ratePercent = dropRate * 0.001;
        dropItems.push({
          item_name: itemName,
          amount: value,
          rate: ratePercent
        });
      }
    }
  }

  debugLog(`找到 ${dropItems.length} 个掉落物品`);

  // 名称作为键，保存概率最高的物品
  const nameTobestItem: { [key: string]: DropItemInfo } = {};
  
  for (const item of dropItems) {
    const itemName = item.item_name.zh_tw;
    const itemRate = item.rate;
    
    // 如果名称还没有记录，或者当前概率更高，则更新
    if (!(itemName in nameTobestItem) || itemRate > nameTobestItem[itemName].rate) {
      nameTobestItem[itemName] = item;
    }
  }
  
  // 将字典值转换为列表
  const uniqueItems = Object.values(nameTobestItem);
  
  // 按掉落率从高到低排序
  const sortedItems = uniqueItems.sort((a, b) => b.rate - a.rate);
  
  debugLog(`去重排序后: ${sortedItems.length} 个物品`);
  return sortedItems;
}

/**
 * 获取现金商店包信息（完全按照 Python 实现）
 */
export function getCashPack(data: GameData, type: string, stageData: Stage): string[] {
  debugLog(`查找现金商店包: type=${type}, stage=${stageData.no}`);
  
  const messages: string[] = [];
  
  // 礼包类型映射
  const packageTypeMapping: { [key: string]: string } = {
    'barrier': '通关礼包',
    'stage': '主线礼包', 
    'tower': '起源之塔礼包',
    'grade_eternal': '角色升阶礼包'
  };
  
  // 获取礼包类型显示名称
  const packageTypeName = packageTypeMapping[type] || '特殊礼包';
  
  // 获取符合条件的商店物品
  const shopItems = data.cash_shop_item.json.filter(item => 
    item.type === type && item.type_value === String(stageData.no)
  );

  debugLog(`找到 ${shopItems.length} 个相关商店物品`);

  if (shopItems.length > 0) {
    shopItems.forEach(shopItem => {
      const packageInfo: string[] = [];
      packageInfo.push(`▼【${packageTypeName}】`);
      
             // 获取礼包名称和描述
       const nameSno = shopItem.name_sno;
       const packageName = nameSno ? getStringByType(data, "cashshop", nameSno)?.zh_tw || "？？？" : "？？？";
       
       const infoSno = shopItem.item_info_sno;
       const packageDesc = infoSno ? getStringByType(data, "cashshop", infoSno)?.zh_tw || "？？？" : "？？？";
       
       const descSno = shopItem.desc_sno;
       let limitDesc = descSno ? getStringByType(data, "ui", descSno)?.zh_tw || "？？？" : "？？？";
      // 简化format处理，直接替换占位符
      limitDesc = limitDesc.replace('{0}', String(shopItem.limit_buy || 0));
      
      // 基本信息部分
      const basicInfo: string[] = [`礼包名称：${packageName}`];
      if (packageDesc && packageDesc !== "？？？") {
        basicInfo.push(`礼包描述：${packageDesc}`);
      }
      basicInfo.push(limitDesc);
      basicInfo.push(`剩余时间：${shopItem.limit_hour || 0}小时`);
      packageInfo.push(basicInfo.join('\n'));
      
      // 礼包内容部分
      const contentInfo: string[] = [];
      if (shopItem.item_infos) {
        try {
          // 解析item_infos字符串，格式类似: "[[item_no,amount],[item_no,amount]]"
          const itemsStr = shopItem.item_infos.replace(/\[|\]/g, '').split(',');
          const items: Array<[number, number]> = [];
          for (let i = 0; i < itemsStr.length; i += 2) {
            if (i + 1 < itemsStr.length) {
              const itemNo = parseInt(itemsStr[i].trim());
              const amount = parseInt(itemsStr[i + 1].trim());
              if (!isNaN(itemNo) && !isNaN(amount)) {
                items.push([itemNo, amount]);
              }
            }
          }
          
          if (items.length > 0) {
            contentInfo.push('\n礼包内容：');
            items.forEach(([itemNo, value]) => {
              const itemName = getStringItem(data, itemNo);
              contentInfo.push(`・${itemName.zh_tw}x${value}`);
            });
          }
        } catch (error) {
          debugLog(`解析礼包内容时发生错误：${error}`);
        }
      }
      if (contentInfo.length > 0) {
        packageInfo.push(contentInfo.join('\n'));
      }
      
      // 价格信息部分
      const priceInfo: string[] = ['\n价格信息：'];
      if (shopItem.price_krw) {
        priceInfo.push(`・ ${shopItem.price_krw}韩元`);
      }
      if (shopItem.price_other) {
        priceInfo.push(`・ ${shopItem.price_other}日元`);
      }
      packageInfo.push(priceInfo.join('\n'));
      
      // 添加分隔线
      packageInfo.push('-'.repeat(25));
      
      // 将整个礼包信息作为一条消息添加到列表中
      messages.push(packageInfo.join('\n'));
    });
  }

  return messages;
}

/**
 * 处理关卡的战斗队伍信息
 */
export function processBattleTeams(data: GameData, stageNo: number): BattleTeamInfo[] {
  debugLog(`处理战斗队伍: stage=${stageNo}`);
  
  const battleTeams = data.stage_battle.json
    .filter(battle => battle.no === stageNo)
    .sort((a, b) => (a.team_no || 0) - (b.team_no || 0));

  debugLog(`找到 ${battleTeams.length} 个战斗队伍`);

  return battleTeams.map(team => {
    const heroes = [];
    const heroPositions = [];
    let firstValidHero = null;

    // 处理1-5个位置的英雄
    for (let i = 1; i <= 5; i++) {
      const heroNo = (team as any)[`hero_no_${i}`];
      const heroGrade = (team as any)[`hero_grade_${i}`];
      const level = (team as any)[`level_${i}`] || 0;

      if (heroNo) {
        heroPositions.push(i);
        
        if (!firstValidHero) {
          firstValidHero = {
            position: i,
            hero_no: heroNo,
            grade: heroGrade,
            level: level
          };
        }

        // 获取英雄名称
        const heroNameData = getStringCharacter(data, heroNo, true);
        // 获取品质名称
        const gradeData = getStringByType(data, 'system', heroGrade);

        debugLog(`位置${i}: 英雄=${heroNo} 名称=${heroNameData.zh_tw} 品质=${gradeData.zh_tw} 等级=${level}`);

        heroes.push({
          position: i,
          name: heroNameData.zh_tw || "未知英雄",
          grade: gradeData.zh_tw || "未知品质",
          level: level
        });
      }
    }

    // 计算队伍战力
    let battlePower;
    if (firstValidHero && firstValidHero.grade && firstValidHero.level) {
      const singleHeroPower = calculateBattlePower(data, 2, firstValidHero.level, firstValidHero.grade);
      battlePower = singleHeroPower * heroPositions.length;
    }

    const formationType = getFormationType(team.formation_type);
    debugLog(`队伍 ${team.team_no}: 阵型=${formationType}, 英雄数=${heroes.length}, 战力=${battlePower}`);

    return {
      team_no: team.team_no || 0,
      formation_type: formationType,
      heroes,
      battle_power: battlePower
    };
  });
}

/**
 * 获取关卡详细信息
 */
export async function getStageDetails(
  dataSource: DataSource, 
  areaNo: number, 
  stageNo: number
): Promise<StageDetails | null> {
  try {
    debugLog(`获取关卡详情: ${areaNo}-${stageNo}, 数据源: ${dataSource}`);
    const data = await loadGameData(dataSource);
    
    // 查找关卡 - 按照 Python 代码的逻辑
    let mainStage = null;
    let dropGroupNo = null;
    
    for (const stage of data.stage.json) {
      if (stage.area_no === areaNo && stage.stage_no === stageNo) {
        if ("area_no" in stage) { // 确保是主线关卡
          mainStage = stage;
          dropGroupNo = stage.item_drop_group_no;
          break; // 找到主线关卡就直接跳出
        }
      }
    }

    if (!mainStage) {
      debugLog(`未找到关卡: ${areaNo}-${stageNo}`);
      return null;
    }

    debugLog(`找到关卡数据`, mainStage);

    // 获取关卡类型 - 严格按照 Python 代码逻辑：使用 level_type 字段
    let levelType = "";
    if (mainStage.level_type) {
      debugLog(`关卡有 level_type 字段: ${mainStage.level_type}`);
      for (const system of data.string_system.json) {
        if (system.no === mainStage.level_type) {
          levelType = system.zh_tw || "未知类型";  // 确保使用 zh_tw
          debugLog(`找到关卡类型字符串: ${levelType}`);
          break;
        }
      }
      if (!levelType) {
        debugLog(`未找到 level_type=${mainStage.level_type} 对应的字符串`);
      }
    } else {
      debugLog(`关卡没有 level_type 字段`);
    }

    debugLog(`最终关卡类型: "${levelType}"`);
    debugLog(`关卡经验值: ${mainStage.exp}`);

    // 获取固定掉落物品
    const fixedItems = [];
    for (let i = 1; i <= 9; i++) {
      const itemNo = (mainStage as any)[`item_no_${i}`];
      const amount = (mainStage as any)[`amount_${i}`];
      
      if (itemNo) {
        const itemName = getStringItem(data, itemNo);
        fixedItems.push({
          name: itemName.zh_tw,  // 确保使用 zh_tw
          amount: amount || 0
        });
      }
    }

    // 获取关卡编号 - 使用 stage 的 no 字段，不是 area_no-stage_no
    const stageNoForBattle = mainStage.no;

    // 获取战斗队伍信息
    const battleTeams = processBattleTeams(data, stageNoForBattle);

    // 获取掉落物品信息
    const dropItems = getDropItemRate(data, dropGroupNo || undefined);

    // 获取现金商店包信息
    const cashPacks = getCashPack(data, 'stage', mainStage);

    const stageDetails = {
      area_no: areaNo,
      stage_no: stageNo,
      level_type: levelType,
      exp: mainStage.exp,
      fixed_items: fixedItems,
      battle_teams: battleTeams,
      drop_items: dropItems,
      cash_packs: cashPacks
    };

    debugLog(`关卡详情构建完成`, stageDetails);
    return stageDetails;
  } catch (error) {
    debugLog(`获取关卡详情失败`, error);
    console.error('Error getting stage details:', error);
    return null;
  }
}

/**
 * 获取所有可用的关卡列表（严格过滤主线关卡）
 */
export async function getStageList(dataSource: DataSource): Promise<Stage[]> {
  try {
    debugLog(`获取关卡列表，数据源: ${dataSource}`);
    
    const data = await loadGameData(dataSource);
    
    debugLog(`原始关卡数据数量: ${data.stage.json.length}`);
    
    // 检查数据结构
    if (data.stage.json.length > 0) {
      const firstStage = data.stage.json[0];
      debugLog(`第一个关卡数据示例`, firstStage);
    }
    
    // 严格按照 Python 逻辑过滤关卡 - 确保是主线关卡
    const filteredStages = data.stage.json.filter(stage => {
      // 检查是否有必要的主线关卡字段
      const hasAreaNo = stage.area_no !== undefined && stage.area_no !== null && stage.area_no > 0;
      const hasStageNo = stage.stage_no !== undefined && stage.stage_no !== null && stage.stage_no > 0;
      const isMainStage = "area_no" in stage && "stage_no" in stage; // 确保是主线关卡
      const hasStageType = stage.stage_type === 1; // 主线关卡的stage_type应该是1
      
      return hasAreaNo && hasStageNo && isMainStage && hasStageType;
    });
    
    debugLog(`过滤后的关卡数量: ${filteredStages.length}`);
    
    const sortedStages = filteredStages.sort((a, b) => {
      if (a.area_no !== b.area_no) {
        return a.area_no - b.area_no;
      }
      return a.stage_no - b.stage_no;
    });
    
    debugLog(`关卡列表排序完成`);
    
    if (sortedStages.length > 0) {
      debugLog(`第一个关卡: ${sortedStages[0].area_no}-${sortedStages[0].stage_no}`);
      debugLog(`最后一个关卡: ${sortedStages[sortedStages.length - 1].area_no}-${sortedStages[sortedStages.length - 1].stage_no}`);
      
      // 动态统计每个区域的关卡数量和最大关卡号
      const areaStats: { [key: number]: { count: number, maxStage: number, stages: number[] } } = {};
      sortedStages.forEach(stage => {
        const areaNo = stage.area_no;
        if (!areaStats[areaNo]) {
          areaStats[areaNo] = { count: 0, maxStage: 0, stages: [] };
        }
        areaStats[areaNo].count++;
        areaStats[areaNo].maxStage = Math.max(areaStats[areaNo].maxStage, stage.stage_no);
        areaStats[areaNo].stages.push(stage.stage_no);
      });
      
      // 显示详细统计
      Object.keys(areaStats).forEach(areaKey => {
        const areaNo = parseInt(areaKey);
        const stats = areaStats[areaNo];
        const stageList = stats.stages.sort((a, b) => a - b);
        debugLog(`区域 ${areaNo}: ${stats.count} 个关卡 [${stageList.join(',')}]`);
      });
    }
    
    return sortedStages;
  } catch (error) {
    debugLog(`获取关卡列表失败`, error);
    console.error('Error getting stage list:', error);
    return [];
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats() {
  const memoryCache = global.__appCache?.dataCache || new Map();
  const memoryHits = global.__appCache?.cacheHitCount || 0;
  const memoryMisses = global.__appCache?.cacheMissCount || 0;
  const dbHits = global.__appCache?.dbHitCount || 0;
  
  let dbStats = null;
  if (typeof window !== 'undefined') {
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/cache/stats`);
      if (response.ok) {
        const result = await response.json();
        dbStats = result.stats;
      }
    } catch (error) {
      console.error('获取数据库缓存统计失败:', error);
    }
  }
  
  return {
    memory: {
      totalEntries: memoryCache.size,
      cacheHits: memoryHits,
      cacheMisses: memoryMisses
    },
    database: {
      hits: dbHits,
      stats: dbStats
    }
  };
}

/**
 * 清除所有缓存
 */
export async function clearCache(): Promise<void> {
  // 清除内存缓存
  if (global.__appCache) {
    global.__appCache.dataCache.clear();
    global.__appCache.cacheHitCount = 0;
    global.__appCache.cacheMissCount = 0;
    global.__appCache.dbHitCount = 0;
  }
  
  // 清除数据库缓存
  if (typeof window !== 'undefined') {
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/cache/clear`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        debugLog(`缓存已清除（内存 + 数据库）- ${result.message}`);
      } else {
        debugLog('缓存已清除（内存），数据库清理失败');
      }
    } catch (error) {
      console.error('清除数据库缓存失败:', error);
      debugLog('缓存已清除（仅内存）');
    }
  } else {
    debugLog('缓存已清除（仅内存）');
  }
}

// 管理内存缓存大小
function manageMemoryCacheSize() {
  if (!CACHE_CONFIG.enableMemoryCache) return;
  
  const cache = global.__appCache!.dataCache;
  const maxSize = CACHE_CONFIG.maxMemoryCacheSize;
  
  if (cache.size > maxSize) {
    const entries = Array.from(cache.entries());
    const toKeep = entries.slice(-Math.floor(maxSize * 0.8));
    
    cache.clear();
    toKeep.forEach(([key, value]) => {
      cache.set(key, value);
    });
    
    debugLog(`🧹 内存缓存清理完成: ${entries.length} -> ${cache.size} 条目`);
  }
}