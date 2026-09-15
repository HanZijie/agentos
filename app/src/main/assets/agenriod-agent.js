
if (!globalThis.TextEncoder) globalThis.TextEncoder = class { encode(value) { const binary = unescape(encodeURIComponent(String(value))); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes; } };
if (!globalThis.TextDecoder) globalThis.TextDecoder = class { decode(bytes) { let binary = ""; for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]); return decodeURIComponent(escape(binary)); } };
if (!globalThis.structuredClone) globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
if (!globalThis.queueMicrotask) globalThis.queueMicrotask = (fn) => Promise.resolve().then(fn);
if (!globalThis.setTimeout) globalThis.setTimeout = (fn) => { Promise.resolve().then(fn); return 0; };
if (!globalThis.clearTimeout) globalThis.clearTimeout = () => {};
if (!globalThis.AbortSignal) { globalThis.AbortSignal = class { constructor() { this.aborted = false; this._listeners = []; } addEventListener(type, fn) { if (type === "abort") this._listeners.push(fn); } removeEventListener(type, fn) { this._listeners = this._listeners.filter((item) => item !== fn); } throwIfAborted() { if (this.aborted) throw new Error("This operation was aborted"); } static any(signals) { const controller = new AbortController(); for (const signal of signals) if (signal?.aborted) controller.abort(); return controller.signal; } static timeout() { return new AbortController().signal; } }; }
if (!globalThis.AbortController) { globalThis.AbortController = class { constructor() { this.signal = new AbortSignal(); } abort() { if (this.signal.aborted) return; this.signal.aborted = true; for (const fn of this.signal._listeners) fn(); } }; }
if (!globalThis.URL) globalThis.URL = class { constructor(input, base) { const value = String(input); this.href = base && !value.includes("://") ? String(base).replace(/\/$/, "") + "/" + value.replace(/^\//, "") : value; const match = this.href.match(/^([a-z]+:)?(?:\/\/([^/]+))?(.*)$/i) || []; this.protocol = match[1] || ""; this.hostname = (match[2] || "").split(":")[0]; this.pathname = match[3] || "/"; this.origin = this.protocol && match[2] ? this.protocol + "//" + match[2] : "null"; this.search = ""; this.hash = ""; } toString() { return this.href; } };
if (!globalThis.crypto) globalThis.crypto = {};
if (!globalThis.crypto.randomUUID) globalThis.crypto.randomUUID = () => `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // runtime/node_modules/typebox/build/system/memory/memory.mjs
  var memory_exports = {};
  __export(memory_exports, {
    Assign: () => Assign,
    Clone: () => Clone,
    Create: () => Create,
    Discard: () => Discard,
    Metrics: () => Metrics,
    Update: () => Update
  });

  // runtime/node_modules/typebox/build/system/memory/metrics.mjs
  var Metrics = {
    assign: 0,
    create: 0,
    clone: 0,
    discard: 0,
    update: 0
  };

  // runtime/node_modules/typebox/build/system/memory/assign.mjs
  function Assign(left, right) {
    Metrics.assign += 1;
    return { ...left, ...right };
  }

  // runtime/node_modules/typebox/build/guard/emit.mjs
  var emit_exports = {};
  __export(emit_exports, {
    And: () => And,
    ArrayLiteral: () => ArrayLiteral,
    ArrowFunction: () => ArrowFunction,
    Call: () => Call,
    ConstDeclaration: () => ConstDeclaration,
    Constant: () => Constant,
    Entries: () => Entries2,
    Every: () => Every2,
    HasPropertyKey: () => HasPropertyKey2,
    If: () => If,
    IsArray: () => IsArray2,
    IsBigInt: () => IsBigInt2,
    IsBoolean: () => IsBoolean2,
    IsConstructor: () => IsConstructor2,
    IsDeepEqual: () => IsDeepEqual2,
    IsEqual: () => IsEqual2,
    IsFunction: () => IsFunction2,
    IsGreaterEqualThan: () => IsGreaterEqualThan2,
    IsGreaterThan: () => IsGreaterThan2,
    IsInteger: () => IsInteger2,
    IsLessEqualThan: () => IsLessEqualThan2,
    IsLessThan: () => IsLessThan2,
    IsMaxLength: () => IsMaxLength3,
    IsMinLength: () => IsMinLength3,
    IsNull: () => IsNull2,
    IsNumber: () => IsNumber2,
    IsObject: () => IsObject2,
    IsObjectNotArray: () => IsObjectNotArray2,
    IsString: () => IsString2,
    IsSymbol: () => IsSymbol2,
    IsUndefined: () => IsUndefined2,
    Keys: () => Keys2,
    Member: () => Member,
    MultipleOf: () => MultipleOf,
    New: () => New,
    Not: () => Not,
    Or: () => Or,
    PrefixIncrement: () => PrefixIncrement,
    ReduceAnd: () => ReduceAnd,
    ReduceOr: () => ReduceOr,
    Return: () => Return,
    Statements: () => Statements,
    Ternary: () => Ternary
  });

  // runtime/node_modules/typebox/build/guard/guard.mjs
  var guard_exports = {};
  __export(guard_exports, {
    Entries: () => Entries,
    EntriesRegExp: () => EntriesRegExp,
    Every: () => Every,
    EveryAll: () => EveryAll,
    GraphemeCount: () => GraphemeCount2,
    HasPropertyKey: () => HasPropertyKey,
    IsArray: () => IsArray,
    IsBigInt: () => IsBigInt,
    IsBoolean: () => IsBoolean,
    IsClassInstance: () => IsClassInstance,
    IsConstructor: () => IsConstructor,
    IsDeepEqual: () => IsDeepEqual,
    IsEqual: () => IsEqual,
    IsFunction: () => IsFunction,
    IsGreaterEqualThan: () => IsGreaterEqualThan,
    IsGreaterThan: () => IsGreaterThan,
    IsInteger: () => IsInteger,
    IsLessEqualThan: () => IsLessEqualThan,
    IsLessThan: () => IsLessThan,
    IsMaxLength: () => IsMaxLength2,
    IsMinLength: () => IsMinLength2,
    IsMultipleOf: () => IsMultipleOf,
    IsNull: () => IsNull,
    IsNumber: () => IsNumber,
    IsObject: () => IsObject,
    IsObjectNotArray: () => IsObjectNotArray,
    IsString: () => IsString,
    IsSymbol: () => IsSymbol,
    IsUndefined: () => IsUndefined,
    IsUnsafePropertyKey: () => IsUnsafePropertyKey,
    IsValueLike: () => IsValueLike,
    Keys: () => Keys,
    ShiftLeft: () => ShiftLeft,
    Symbols: () => Symbols,
    Values: () => Values
  });

  // runtime/node_modules/typebox/build/guard/string.mjs
  function IsBetween(value, min, max) {
    return value >= min && value <= max;
  }
  function IsZeroWidthJoiner(value) {
    return value === 8205;
  }
  function IsHighSurrogate(value) {
    return IsBetween(value, 55296, 56319);
  }
  function IsRegionalIndicator(value) {
    return IsBetween(value, 127462, 127487);
  }
  function IsVariationSelector(value) {
    return IsBetween(value, 65024, 65039);
  }
  function IsCombiningMark(value) {
    return IsBetween(value, 768, 879) || IsBetween(value, 6832, 6911) || IsBetween(value, 7616, 7679) || IsBetween(value, 65056, 65071);
  }
  function CodePointLength(value) {
    return value > 65535 ? 2 : 1;
  }
  function ConsumeModifiers(value, index3) {
    while (index3 < value.length) {
      const point = value.codePointAt(index3);
      if (IsCombiningMark(point) || IsVariationSelector(point)) {
        index3 += CodePointLength(point);
      } else {
        break;
      }
    }
    return index3;
  }
  function NextGraphemeClusterIndex(value, clusterStart) {
    const startCP = value.codePointAt(clusterStart);
    let clusterEnd = clusterStart + CodePointLength(startCP);
    clusterEnd = ConsumeModifiers(value, clusterEnd);
    while (clusterEnd < value.length - 1 && value[clusterEnd] === "\u200D") {
      const nextCP = value.codePointAt(clusterEnd + 1);
      clusterEnd += 1 + CodePointLength(nextCP);
      clusterEnd = ConsumeModifiers(value, clusterEnd);
    }
    if (IsRegionalIndicator(startCP) && clusterEnd < value.length && IsRegionalIndicator(value.codePointAt(clusterEnd))) {
      clusterEnd += CodePointLength(value.codePointAt(clusterEnd));
    }
    return clusterEnd;
  }
  function IsGraphemeCodePoint(value) {
    return IsHighSurrogate(value) || IsCombiningMark(value) || IsVariationSelector(value) || IsZeroWidthJoiner(value);
  }
  function GraphemeCount(value) {
    let count = 0;
    let index3 = 0;
    while (index3 < value.length) {
      index3 = NextGraphemeClusterIndex(value, index3);
      count++;
    }
    return count;
  }
  function IsMinLength(value, minLength) {
    if (minLength === 0)
      return true;
    let count = 0;
    let index3 = 0;
    while (index3 < value.length) {
      index3 = NextGraphemeClusterIndex(value, index3);
      count++;
      if (count >= minLength)
        return true;
    }
    return false;
  }
  function IsMaxLength(value, maxLength) {
    let count = 0;
    let index3 = 0;
    while (index3 < value.length) {
      index3 = NextGraphemeClusterIndex(value, index3);
      count++;
      if (count > maxLength)
        return false;
    }
    return true;
  }
  function IsMinLengthFast(value, minLength) {
    if (minLength === 0)
      return true;
    let index3 = 0;
    while (index3 < value.length) {
      if (IsGraphemeCodePoint(value.charCodeAt(index3))) {
        return IsMinLength(value, minLength);
      }
      index3++;
      if (index3 >= minLength)
        return true;
    }
    return false;
  }
  function IsMaxLengthFast(value, maxLength) {
    let index3 = 0;
    while (index3 < value.length) {
      if (IsGraphemeCodePoint(value.charCodeAt(index3))) {
        return IsMaxLength(value, maxLength);
      }
      index3++;
      if (index3 > maxLength)
        return false;
    }
    return true;
  }

  // runtime/node_modules/typebox/build/guard/guard.mjs
  function IsArray(value) {
    return Array.isArray(value);
  }
  function IsBigInt(value) {
    return IsEqual(typeof value, "bigint");
  }
  function IsBoolean(value) {
    return IsEqual(typeof value, "boolean");
  }
  function IsConstructor(value) {
    if (IsUndefined(value) || !IsFunction(value))
      return false;
    const result = Function.prototype.toString.call(value);
    if (/^class\s/.test(result))
      return true;
    if (/\[native code\]/.test(result))
      return true;
    return false;
  }
  function IsFunction(value) {
    return IsEqual(typeof value, "function");
  }
  function IsInteger(value) {
    return Number.isInteger(value);
  }
  function IsNull(value) {
    return IsEqual(value, null);
  }
  function IsNumber(value) {
    return Number.isFinite(value);
  }
  function IsObjectNotArray(value) {
    return IsObject(value) && !IsArray(value);
  }
  function IsObject(value) {
    return IsEqual(typeof value, "object") && !IsNull(value);
  }
  function IsString(value) {
    return IsEqual(typeof value, "string");
  }
  function IsSymbol(value) {
    return IsEqual(typeof value, "symbol");
  }
  function IsUndefined(value) {
    return IsEqual(value, void 0);
  }
  function IsEqual(left, right) {
    return left === right;
  }
  function IsGreaterThan(left, right) {
    return left > right;
  }
  function IsLessThan(left, right) {
    return left < right;
  }
  function IsLessEqualThan(left, right) {
    return left <= right;
  }
  function IsGreaterEqualThan(left, right) {
    return left >= right;
  }
  function IsMultipleOf(dividend, divisor) {
    if (IsBigInt(dividend) || IsBigInt(divisor)) {
      return BigInt(dividend) % BigInt(divisor) === 0n;
    }
    const tolerance = 1e-10;
    if (!IsNumber(dividend))
      return true;
    if (IsInteger(dividend) && 1 / divisor % 1 === 0)
      return true;
    const mod = dividend % divisor;
    return Math.min(Math.abs(mod), Math.abs(mod - divisor), Math.abs(mod + divisor)) < tolerance;
  }
  function IsClassInstance(value) {
    if (!IsObject(value))
      return false;
    const proto = globalThis.Object.getPrototypeOf(value);
    if (IsNull(proto))
      return false;
    return IsEqual(typeof proto.constructor, "function") && !(IsEqual(proto.constructor, globalThis.Object) || IsEqual(proto.constructor.name, "Object"));
  }
  function IsValueLike(value) {
    return IsBigInt(value) || IsBoolean(value) || IsNull(value) || IsNumber(value) || IsString(value) || IsUndefined(value);
  }
  function GraphemeCount2(value) {
    return GraphemeCount(value);
  }
  function IsMaxLength2(value, length) {
    return IsMaxLengthFast(value, length);
  }
  function IsMinLength2(value, length) {
    return IsMinLengthFast(value, length);
  }
  function Every(value, offset, callback) {
    for (let index3 = offset; index3 < value.length; index3++) {
      if (!callback(value[index3], index3))
        return false;
    }
    return true;
  }
  function EveryAll(value, offset, callback) {
    let result = true;
    for (let index3 = offset; index3 < value.length; index3++) {
      if (!callback(value[index3], index3))
        result = false;
    }
    return result;
  }
  function ShiftLeft(array, true_, false_) {
    return IsEqual(array.length, 0) ? false_() : true_(array[0], array.slice(1));
  }
  function IsUnsafePropertyKey(key) {
    return IsEqual(key, "__proto__") || IsEqual(key, "constructor") || IsEqual(key, "prototype");
  }
  function HasPropertyKey(value, key) {
    return IsUnsafePropertyKey(key) ? Object.prototype.hasOwnProperty.call(value, key) : key in value;
  }
  function EntriesRegExp(value) {
    return Keys(value).map((key) => [new RegExp(`^${key}$`), value[key]]);
  }
  function Entries(value) {
    return Object.entries(value);
  }
  function Keys(value) {
    return Object.getOwnPropertyNames(value);
  }
  function Symbols(value) {
    return Object.getOwnPropertySymbols(value);
  }
  function Values(value) {
    return Object.values(value);
  }
  function DeepEqualObject(left, right) {
    if (!IsObject(right))
      return false;
    const keys = Keys(left);
    return IsEqual(keys.length, Keys(right).length) && keys.every((key) => IsDeepEqual(left[key], right[key]));
  }
  function DeepEqualArray(left, right) {
    return IsArray(right) && IsEqual(left.length, right.length) && left.every((_, index3) => IsDeepEqual(left[index3], right[index3]));
  }
  function IsDeepEqual(left, right) {
    return IsArray(left) ? DeepEqualArray(left, right) : IsObject(left) ? DeepEqualObject(left, right) : IsEqual(left, right);
  }

  // runtime/node_modules/typebox/build/guard/emit.mjs
  var identifierRegExp = /^[\p{ID_Start}_$][\p{ID_Continue}_$\u200C\u200D]*$/u;
  function IsIdentifier(value) {
    return identifierRegExp.test(value);
  }
  function And(left, right) {
    return `(${left} && ${right})`;
  }
  function Or(left, right) {
    return `(${left} || ${right})`;
  }
  function Not(expr) {
    return `!(${expr})`;
  }
  function IsArray2(value) {
    return `Array.isArray(${value})`;
  }
  function IsBigInt2(value) {
    return `typeof ${value} === "bigint"`;
  }
  function IsBoolean2(value) {
    return `typeof ${value} === "boolean"`;
  }
  function IsInteger2(value) {
    return `Number.isInteger(${value})`;
  }
  function IsNull2(value) {
    return `${value} === null`;
  }
  function IsNumber2(value) {
    return `Number.isFinite(${value})`;
  }
  function IsObjectNotArray2(value) {
    return And(IsObject2(value), Not(IsArray2(value)));
  }
  function IsObject2(value) {
    return `typeof ${value} === "object" && ${value} !== null`;
  }
  function IsString2(value) {
    return `typeof ${value} === "string"`;
  }
  function IsSymbol2(value) {
    return `typeof ${value} === "symbol"`;
  }
  function IsUndefined2(value) {
    return `${value} === undefined`;
  }
  function IsFunction2(value) {
    return `typeof ${value} === "function"`;
  }
  function IsConstructor2(value) {
    return `Guard.IsConstructor(${value})`;
  }
  function IsEqual2(left, right) {
    return `${left} === ${right}`;
  }
  function IsGreaterThan2(left, right) {
    return `${left} > ${right}`;
  }
  function IsLessThan2(left, right) {
    return `${left} < ${right}`;
  }
  function IsLessEqualThan2(left, right) {
    return `${left} <= ${right}`;
  }
  function IsGreaterEqualThan2(left, right) {
    return `${left} >= ${right}`;
  }
  function IsMinLength3(value, length) {
    return `Guard.IsMinLength(${value}, ${length})`;
  }
  function IsMaxLength3(value, length) {
    return `Guard.IsMaxLength(${value}, ${length})`;
  }
  function Every2(value, offset, params, expression) {
    return IsEqual(offset, "0") ? `${value}.every((${params[0]}, ${params[1]}) => ${expression})` : `((value, callback) => { for(let index = ${offset}; index < value.length; index++) if (!callback(value[index], index)) return false; return true })(${value}, (${params[0]}, ${params[1]}) => ${expression})`;
  }
  function Entries2(value) {
    return `Object.entries(${value})`;
  }
  function Keys2(value) {
    return `Object.getOwnPropertyNames(${value})`;
  }
  function HasPropertyKey2(value, key) {
    const isProtoField = IsEqual(key, '"__proto__"') || IsEqual(key, '"constructor"');
    return isProtoField ? `Object.prototype.hasOwnProperty.call(${value}, ${key})` : `${key} in ${value}`;
  }
  function IsDeepEqual2(left, right) {
    return `Guard.IsDeepEqual(${left}, ${right})`;
  }
  function ArrayLiteral(elements) {
    return `[${elements.join(", ")}]`;
  }
  function ArrowFunction(parameters, body) {
    return `((${parameters.join(", ")}) => ${body})`;
  }
  function Call(value, arguments_) {
    return `${value}(${arguments_.join(", ")})`;
  }
  function New(value, arguments_) {
    return `new ${value}(${arguments_.join(", ")})`;
  }
  function Member(left, right) {
    return `${left}${IsIdentifier(right) ? `.${right}` : `[${Constant(right)}]`}`;
  }
  function Constant(value) {
    return IsString(value) ? JSON.stringify(value) : `${value}`;
  }
  function Ternary(condition, true_, false_) {
    return `(${condition} ? ${true_} : ${false_})`;
  }
  function Statements(statements) {
    return `{ ${statements.join("; ")}; }`;
  }
  function ConstDeclaration(identifier, expression) {
    return `const ${identifier} = ${expression}`;
  }
  function If(condition, then) {
    return `if(${condition}) { ${then} }`;
  }
  function Return(expression) {
    return `return ${expression}`;
  }
  function ReduceAnd(operands) {
    return IsEqual(operands.length, 0) ? "true" : operands.reduce((left, right) => And(left, right));
  }
  function ReduceOr(operands) {
    return IsEqual(operands.length, 0) ? "false" : operands.reduce((left, right) => Or(left, right));
  }
  function PrefixIncrement(expression) {
    return `++${expression}`;
  }
  function MultipleOf(dividend, divisor) {
    return `Guard.IsMultipleOf(${dividend}, ${divisor})`;
  }

  // runtime/node_modules/typebox/build/guard/globals.mjs
  var globals_exports = {};
  __export(globals_exports, {
    IsBigInt64Array: () => IsBigInt64Array,
    IsBigUint64Array: () => IsBigUint64Array,
    IsBoolean: () => IsBoolean3,
    IsDate: () => IsDate,
    IsFloat32Array: () => IsFloat32Array,
    IsFloat64Array: () => IsFloat64Array,
    IsInt16Array: () => IsInt16Array,
    IsInt32Array: () => IsInt32Array,
    IsInt8Array: () => IsInt8Array,
    IsMap: () => IsMap,
    IsNumber: () => IsNumber3,
    IsRegExp: () => IsRegExp,
    IsSet: () => IsSet,
    IsString: () => IsString3,
    IsTypeArray: () => IsTypeArray,
    IsUint16Array: () => IsUint16Array,
    IsUint32Array: () => IsUint32Array,
    IsUint8Array: () => IsUint8Array,
    IsUint8ClampedArray: () => IsUint8ClampedArray
  });
  function IsBoolean3(value) {
    return value instanceof Boolean;
  }
  function IsNumber3(value) {
    return value instanceof Number;
  }
  function IsString3(value) {
    return value instanceof String;
  }
  function IsTypeArray(value) {
    return globalThis.ArrayBuffer.isView(value);
  }
  function IsInt8Array(value) {
    return value instanceof globalThis.Int8Array;
  }
  function IsUint8Array(value) {
    return value instanceof globalThis.Uint8Array;
  }
  function IsUint8ClampedArray(value) {
    return value instanceof globalThis.Uint8ClampedArray;
  }
  function IsInt16Array(value) {
    return value instanceof globalThis.Int16Array;
  }
  function IsUint16Array(value) {
    return value instanceof globalThis.Uint16Array;
  }
  function IsInt32Array(value) {
    return value instanceof globalThis.Int32Array;
  }
  function IsUint32Array(value) {
    return value instanceof globalThis.Uint32Array;
  }
  function IsFloat32Array(value) {
    return value instanceof globalThis.Float32Array;
  }
  function IsFloat64Array(value) {
    return value instanceof globalThis.Float64Array;
  }
  function IsBigInt64Array(value) {
    return value instanceof globalThis.BigInt64Array;
  }
  function IsBigUint64Array(value) {
    return value instanceof globalThis.BigUint64Array;
  }
  function IsRegExp(value) {
    return value instanceof globalThis.RegExp;
  }
  function IsDate(value) {
    return value instanceof globalThis.Date;
  }
  function IsSet(value) {
    return value instanceof globalThis.Set;
  }
  function IsMap(value) {
    return value instanceof globalThis.Map;
  }

  // runtime/node_modules/typebox/build/guard/index.mjs
  var guard_default = guard_exports;

  // runtime/node_modules/typebox/build/system/memory/clone.mjs
  function FromClassInstance(value) {
    return value;
  }
  function IsTypeObject(value) {
    return guard_exports.HasPropertyKey(value, "~kind") || guard_exports.HasPropertyKey(value, "~unsafe");
  }
  function FromTypeObject(value) {
    const result = {};
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Object.keys(descriptors)) {
      if (guard_exports.IsUnsafePropertyKey(key))
        continue;
      const descriptor = descriptors[key];
      if (guard_exports.HasPropertyKey(descriptor, "value")) {
        Object.defineProperty(result, key, { ...descriptor, value: FromValue(descriptor.value) });
      }
    }
    return result;
  }
  function FromPlainObject(value) {
    const result = {};
    for (const key of guard_exports.Keys(value)) {
      if (guard_exports.IsUnsafePropertyKey(key))
        continue;
      result[key] = FromValue(value[key]);
    }
    for (const key of guard_exports.Symbols(value)) {
      result[key] = FromValue(value[key]);
    }
    return result;
  }
  function FromObject(value) {
    return guard_exports.IsClassInstance(value) ? FromClassInstance(value) : IsTypeObject(value) ? FromTypeObject(value) : FromPlainObject(value);
  }
  function FromArray(value) {
    return value.map((element) => FromValue(element));
  }
  function FromTypedArray(value) {
    return value.slice();
  }
  function FromRegExp(value) {
    return new RegExp(value.source, value.flags);
  }
  function FromMap(value) {
    return new Map(FromValue([...value.entries()]));
  }
  function FromSet(value) {
    return new Set(FromValue([...value.values()]));
  }
  function FromValue(value) {
    return globals_exports.IsTypeArray(value) ? FromTypedArray(value) : globals_exports.IsRegExp(value) ? FromRegExp(value) : globals_exports.IsMap(value) ? FromMap(value) : globals_exports.IsSet(value) ? FromSet(value) : guard_exports.IsArray(value) ? FromArray(value) : guard_exports.IsObject(value) ? FromObject(value) : value;
  }
  function Clone(value) {
    Metrics.clone += 1;
    return FromValue(value);
  }

  // runtime/node_modules/typebox/build/system/settings/settings.mjs
  var settings_exports = {};
  __export(settings_exports, {
    Get: () => Get,
    Reset: () => Reset,
    Set: () => Set2
  });
  var settings = {
    immutableTypes: false,
    maxErrors: 8,
    useAcceleration: true,
    exactOptionalPropertyTypes: false,
    enumerableKind: false,
    correctiveParse: false,
    unionPrioritySort: true
  };
  function Reset() {
    settings.immutableTypes = false;
    settings.maxErrors = 8;
    settings.useAcceleration = true;
    settings.exactOptionalPropertyTypes = false;
    settings.enumerableKind = false;
    settings.correctiveParse = false;
    settings.unionPrioritySort = true;
  }
  function Set2(options) {
    for (const key of guard_exports.Keys(options)) {
      const value = options[key];
      if (value !== void 0) {
        Object.defineProperty(settings, key, { value });
      }
    }
  }
  function Get() {
    return settings;
  }

  // runtime/node_modules/typebox/build/system/memory/create.mjs
  function MergeHidden(left, right) {
    for (const key of Object.keys(right)) {
      Object.defineProperty(left, key, {
        configurable: true,
        writable: true,
        enumerable: false,
        value: right[key]
      });
    }
    return left;
  }
  function Merge(left, right) {
    return { ...left, ...right };
  }
  function Create(hidden, enumerable, options = {}) {
    Metrics.create += 1;
    const settings2 = settings_exports.Get();
    const withOptions = Merge(enumerable, options);
    const withHidden = settings2.enumerableKind ? Merge(withOptions, hidden) : MergeHidden(withOptions, hidden);
    return settings2.immutableTypes ? Object.freeze(withHidden) : withHidden;
  }

  // runtime/node_modules/typebox/build/system/memory/discard.mjs
  function Discard(value, propertyKeys) {
    Metrics.discard += 1;
    const result = {};
    const descriptors = Object.getOwnPropertyDescriptors(Clone(value));
    const keysToDiscard = new Set(propertyKeys);
    for (const key of Object.keys(descriptors)) {
      if (keysToDiscard.has(key))
        continue;
      Object.defineProperty(result, key, descriptors[key]);
    }
    return result;
  }

  // runtime/node_modules/typebox/build/system/memory/update.mjs
  function Update(current, hidden, enumerable) {
    Metrics.update += 1;
    const settings2 = settings_exports.Get();
    const result = Clone(current);
    for (const key of Object.keys(hidden)) {
      Object.defineProperty(result, key, {
        configurable: true,
        writable: true,
        enumerable: settings2.enumerableKind,
        value: hidden[key]
      });
    }
    for (const key of Object.keys(enumerable)) {
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: enumerable[key]
      });
    }
    return result;
  }

  // runtime/node_modules/typebox/build/type/types/schema.mjs
  function IsKind(value, kind) {
    return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.IsEqual(value["~kind"], kind);
  }
  function IsSchema(value) {
    return guard_exports.IsObject(value);
  }

  // runtime/node_modules/typebox/build/type/types/deferred.mjs
  function Deferred(action, parameters, options) {
    return memory_exports.Create({ "~kind": "Deferred" }, { type: "deferred", action, parameters, options }, {});
  }
  function IsDeferred(value) {
    return IsKind(value, "Deferred");
  }

  // runtime/node_modules/typebox/build/type/engine/readonly/instantiate_add.mjs
  function AddReadonlyOperation(type) {
    return memory_exports.Update(type, { "~readonly": true }, {});
  }
  function AddReadonlyAction(type, options) {
    const result = memory_exports.Update(AddReadonlyOperation(type), {}, options);
    return result;
  }
  function AddReadonlyInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return AddReadonlyAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/engine/optional/instantiate_add.mjs
  function AddOptionalOperation(type) {
    return memory_exports.Update(type, { "~optional": true }, {});
  }
  function AddOptionalAction(type, options) {
    const result = memory_exports.Update(AddOptionalOperation(type), {}, options);
    return result;
  }
  function AddOptionalInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return AddOptionalAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/types/array.mjs
  function _Array_(items, options) {
    return memory_exports.Create({ "~kind": "Array" }, { type: "array", items }, options);
  }
  function IsArray3(value) {
    return IsKind(value, "Array");
  }
  function ArrayOptions(type) {
    return memory_exports.Discard(type, ["~kind", "type", "items"]);
  }

  // runtime/node_modules/typebox/build/type/types/constructor.mjs
  function Constructor(parameters, instanceType, options = {}) {
    return memory_exports.Create({ "~kind": "Constructor" }, { type: "constructor", parameters, instanceType }, options);
  }
  function IsConstructor3(value) {
    return IsKind(value, "Constructor");
  }
  function ConstructorOptions(type) {
    return memory_exports.Discard(type, ["~kind", "type", "parameters", "instanceType"]);
  }

  // runtime/node_modules/typebox/build/type/types/function.mjs
  function _Function_(parameters, returnType, options = {}) {
    return memory_exports.Create({ ["~kind"]: "Function" }, { type: "function", parameters, returnType }, options);
  }
  function IsFunction3(value) {
    return IsKind(value, "Function");
  }
  function FunctionOptions(type) {
    return memory_exports.Discard(type, ["~kind", "type", "parameters", "returnType"]);
  }

  // runtime/node_modules/typebox/build/type/types/ref.mjs
  function Ref(ref, options) {
    return memory_exports.Create({ ["~kind"]: "Ref" }, { $ref: ref }, options);
  }
  function IsRef(value) {
    return IsKind(value, "Ref");
  }

  // runtime/node_modules/typebox/build/type/types/generic.mjs
  function Generic(parameters, expression) {
    return memory_exports.Create({ "~kind": "Generic" }, { type: "generic", parameters, expression });
  }
  function IsGeneric(value) {
    return IsKind(value, "Generic");
  }

  // runtime/node_modules/typebox/build/type/types/any.mjs
  function Any(options) {
    return memory_exports.Create({ ["~kind"]: "Any" }, {}, options);
  }
  function IsAny(value) {
    return IsKind(value, "Any");
  }

  // runtime/node_modules/typebox/build/type/types/never.mjs
  var NeverPattern = "(?!)";
  function Never(options) {
    return memory_exports.Create({ "~kind": "Never" }, { not: {} }, options);
  }
  function IsNever(value) {
    return IsKind(value, "Never");
  }

  // runtime/node_modules/typebox/build/type/action/_add_optional.mjs
  function AddOptionalDeferred(type, options = {}) {
    return Deferred("AddOptional", [type], options);
  }
  function AddOptional(type, options = {}) {
    return AddOptionalAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/types/_optional.mjs
  function Optional(type) {
    return AddOptional(type);
  }
  function IsOptional(value) {
    return IsSchema(value) && guard_exports.HasPropertyKey(value, "~optional");
  }

  // runtime/node_modules/typebox/build/type/types/properties.mjs
  function RequiredArray(properties) {
    return guard_exports.Keys(properties).filter((key) => !IsOptional(properties[key]));
  }
  function PropertyKeys(properties) {
    return guard_exports.Keys(properties);
  }
  function PropertyValues(properties) {
    return guard_exports.Values(properties);
  }

  // runtime/node_modules/typebox/build/type/types/object.mjs
  function _Object_(properties, options = {}) {
    const requiredKeys = RequiredArray(properties);
    const required = requiredKeys.length > 0 ? { required: requiredKeys } : {};
    return memory_exports.Create({ "~kind": "Object" }, { type: "object", ...required, properties }, options);
  }
  function IsObject3(value) {
    return IsKind(value, "Object");
  }
  function ObjectOptions(type) {
    return memory_exports.Discard(type, ["~kind", "type", "properties", "required"]);
  }

  // runtime/node_modules/typebox/build/type/types/unknown.mjs
  function Unknown(options) {
    return memory_exports.Create({ ["~kind"]: "Unknown" }, {}, options);
  }
  function IsUnknown(value) {
    return IsKind(value, "Unknown");
  }

  // runtime/node_modules/typebox/build/type/types/cyclic.mjs
  function Cyclic($defs, $ref, options) {
    const defs = guard_exports.Keys($defs).reduce((result, key) => {
      return { ...result, [key]: memory_exports.Update($defs[key], {}, { $id: key }) };
    }, {});
    return memory_exports.Create({ ["~kind"]: "Cyclic" }, { $defs: defs, $ref }, options);
  }
  function IsCyclic(value) {
    return IsKind(value, "Cyclic");
  }

  // runtime/node_modules/typebox/build/type/types/unsafe.mjs
  function Unsafe(schema) {
    return memory_exports.Update(schema, { ["~unsafe"]: null }, {});
  }
  function IsUnsafe(value) {
    return guard_exports.IsObjectNotArray(value) && guard_exports.HasPropertyKey(value, "~unsafe") && guard_exports.IsNull(value["~unsafe"]);
  }

  // runtime/node_modules/typebox/build/system/arguments/arguments.mjs
  var arguments_exports = {};
  __export(arguments_exports, {
    Match: () => Match
  });
  function Match(args, match) {
    return match[args.length]?.(...args) ?? (() => {
      throw Error("Invalid Arguments");
    })();
  }

  // runtime/node_modules/typebox/build/type/types/infer.mjs
  function Infer(...args) {
    const [name, extends_] = arguments_exports.Match(args, {
      2: (name2, extends_2) => [name2, extends_2, extends_2],
      1: (name2) => [name2, Unknown(), Unknown()]
    });
    return memory_exports.Create({ ["~kind"]: "Infer" }, { type: "infer", name, extends: extends_ }, {});
  }
  function IsInfer(value) {
    return IsKind(value, "Infer");
  }

  // runtime/node_modules/typebox/build/type/types/dependent.mjs
  function Dependent(if_, then_, else_, options = {}) {
    return memory_exports.Create({ "~kind": "Dependent" }, { if: if_, then: then_, else: else_ }, options);
  }
  function IsDependent(value) {
    return IsKind(value, "Dependent");
  }
  function DependentOptions(type) {
    return memory_exports.Discard(type, ["~kind", "if", "then", "else"]);
  }

  // runtime/node_modules/typebox/build/type/engine/enum/typescript_enum_to_enum_values.mjs
  function IsTypeScriptEnumLike(value) {
    return guard_exports.IsObjectNotArray(value);
  }
  function TypeScriptEnumToEnumValues(type) {
    const keys = guard_exports.Keys(type).filter((key) => isNaN(key));
    return keys.reduce((result, key) => [...result, type[key]], []);
  }

  // runtime/node_modules/typebox/build/type/types/enum.mjs
  function IsEnumValue(value) {
    return guard_exports.IsString(value) || guard_exports.IsNumber(value);
  }
  function Enum(value, options) {
    const values = IsTypeScriptEnumLike(value) ? TypeScriptEnumToEnumValues(value) : value;
    return memory_exports.Create({ "~kind": "Enum" }, { enum: values }, options);
  }
  function IsEnum(value) {
    return IsKind(value, "Enum");
  }

  // runtime/node_modules/typebox/build/type/types/intersect.mjs
  function Intersect(types, options = {}) {
    return memory_exports.Create({ "~kind": "Intersect" }, { allOf: types }, options);
  }
  function IsIntersect(value) {
    return IsKind(value, "Intersect");
  }
  function IntersectOptions(type) {
    return memory_exports.Discard(type, ["~kind", "allOf"]);
  }

  // runtime/node_modules/typebox/build/system/environment/environment.mjs
  var environment_exports = {};
  __export(environment_exports, {
    CanEvaluate: () => CanEvaluate,
    Evaluate: () => Evaluate
  });

  // runtime/node_modules/typebox/build/system/environment/evaluate.mjs
  var supported = void 0;
  function TryEvaluate() {
    try {
      Evaluate("null")();
      return true;
    } catch {
      return false;
    }
  }
  function CanEvaluate() {
    if (guard_exports.IsUndefined(supported))
      supported = TryEvaluate();
    return supported && settings_exports.Get().useAcceleration;
  }
  function Evaluate(...args) {
    return new globalThis.Function(...args);
  }

  // runtime/node_modules/typebox/build/system/hashing/hash.mjs
  var hash_exports = {};
  __export(hash_exports, {
    Hash: () => Hash,
    HashCode: () => HashCode
  });

  // runtime/node_modules/typebox/build/system/unreachable/unreachable.mjs
  function Unreachable() {
    throw new Error("Unreachable");
  }

  // runtime/node_modules/typebox/build/system/hashing/hash.mjs
  function InstanceKeys(value) {
    const propertyKeys = /* @__PURE__ */ new Set();
    let current = value;
    while (current && current !== Object.prototype) {
      for (const key of Reflect.ownKeys(current)) {
        if (key !== "constructor" && typeof key !== "symbol")
          propertyKeys.add(key);
      }
      current = Object.getPrototypeOf(current);
    }
    return [...propertyKeys];
  }
  function IsIEEE754(value) {
    return typeof value === "number";
  }
  var ByteMarker;
  (function(ByteMarker2) {
    ByteMarker2[ByteMarker2["Array"] = 0] = "Array";
    ByteMarker2[ByteMarker2["BigInt"] = 1] = "BigInt";
    ByteMarker2[ByteMarker2["Boolean"] = 2] = "Boolean";
    ByteMarker2[ByteMarker2["Date"] = 3] = "Date";
    ByteMarker2[ByteMarker2["Constructor"] = 4] = "Constructor";
    ByteMarker2[ByteMarker2["Function"] = 5] = "Function";
    ByteMarker2[ByteMarker2["Null"] = 6] = "Null";
    ByteMarker2[ByteMarker2["Number"] = 7] = "Number";
    ByteMarker2[ByteMarker2["Object"] = 8] = "Object";
    ByteMarker2[ByteMarker2["RegExp"] = 9] = "RegExp";
    ByteMarker2[ByteMarker2["String"] = 10] = "String";
    ByteMarker2[ByteMarker2["Symbol"] = 11] = "Symbol";
    ByteMarker2[ByteMarker2["TypeArray"] = 12] = "TypeArray";
    ByteMarker2[ByteMarker2["Undefined"] = 13] = "Undefined";
  })(ByteMarker || (ByteMarker = {}));
  var Accumulator = BigInt("14695981039346656037");
  var [Prime, Size] = [BigInt("1099511628211"), BigInt(
    "18446744073709551616"
    /* 2 ^ 64 */
  )];
  var Bytes = Array.from({ length: 256 }).map((_, i) => BigInt(i));
  var F64 = new Float64Array(1);
  var F64In = new DataView(F64.buffer);
  var F64Out = new Uint8Array(F64.buffer);
  function FNV1A64_OP(byte) {
    Accumulator = Accumulator ^ Bytes[byte];
    Accumulator = Accumulator * Prime % Size;
  }
  function FromArray2(value) {
    FNV1A64_OP(ByteMarker.Array);
    for (const item of value) {
      FromValue2(item);
    }
  }
  function FromBigInt(value) {
    FNV1A64_OP(ByteMarker.BigInt);
    F64In.setBigInt64(0, value);
    for (const byte of F64Out) {
      FNV1A64_OP(byte);
    }
  }
  function FromBoolean(value) {
    FNV1A64_OP(ByteMarker.Boolean);
    FNV1A64_OP(value ? 1 : 0);
  }
  function FromConstructor(value) {
    FNV1A64_OP(ByteMarker.Constructor);
    FromValue2(value.toString());
  }
  function FromDate(value) {
    FNV1A64_OP(ByteMarker.Date);
    FromValue2(value.getTime());
  }
  function FromFunction(value) {
    FNV1A64_OP(ByteMarker.Function);
    FromValue2(value.toString());
  }
  function FromNull(_value) {
    FNV1A64_OP(ByteMarker.Null);
  }
  function FromNumber(value) {
    FNV1A64_OP(ByteMarker.Number);
    F64In.setFloat64(
      0,
      value,
      true
      /* little-endian */
    );
    for (const byte of F64Out) {
      FNV1A64_OP(byte);
    }
  }
  function FromObject2(value) {
    FNV1A64_OP(ByteMarker.Object);
    for (const key of InstanceKeys(value).sort()) {
      FromValue2(key);
      FromValue2(value[key]);
    }
  }
  function FromRegExp2(value) {
    FNV1A64_OP(ByteMarker.RegExp);
    FromString(value.toString());
  }
  var encoder = new TextEncoder();
  function FromString(value) {
    FNV1A64_OP(ByteMarker.String);
    for (const byte of encoder.encode(value)) {
      FNV1A64_OP(byte);
    }
  }
  function FromSymbol(value) {
    FNV1A64_OP(ByteMarker.Symbol);
    FromValue2(value.toString());
  }
  function FromTypeArray(value) {
    FNV1A64_OP(ByteMarker.TypeArray);
    const buffer = new Uint8Array(value.buffer);
    for (let i = 0; i < buffer.length; i++) {
      FNV1A64_OP(buffer[i]);
    }
  }
  function FromUndefined(_value) {
    return FNV1A64_OP(ByteMarker.Undefined);
  }
  function FromValue2(value) {
    return globals_exports.IsTypeArray(value) ? FromTypeArray(value) : globals_exports.IsDate(value) ? FromDate(value) : globals_exports.IsRegExp(value) ? FromRegExp2(value) : globals_exports.IsBoolean(value) ? FromBoolean(value.valueOf()) : globals_exports.IsString(value) ? FromString(value.valueOf()) : globals_exports.IsNumber(value) ? FromNumber(value.valueOf()) : IsIEEE754(value) ? FromNumber(value) : guard_exports.IsArray(value) ? FromArray2(value) : guard_exports.IsBoolean(value) ? FromBoolean(value) : guard_exports.IsBigInt(value) ? FromBigInt(value) : guard_exports.IsConstructor(value) ? FromConstructor(value) : guard_exports.IsNull(value) ? FromNull(value) : guard_exports.IsObject(value) ? FromObject2(value) : guard_exports.IsString(value) ? FromString(value) : guard_exports.IsSymbol(value) ? FromSymbol(value) : guard_exports.IsUndefined(value) ? FromUndefined(value) : guard_exports.IsFunction(value) ? FromFunction(value) : Unreachable();
  }
  function HashCode(value) {
    Accumulator = BigInt("14695981039346656037");
    FromValue2(value);
    return Accumulator;
  }
  function Hash(value) {
    return HashCode(value).toString(16).padStart(16, "0");
  }

  // runtime/node_modules/typebox/build/system/locale/en_US.mjs
  function en_US(error) {
    switch (error.keyword) {
      case "additionalProperties":
        return "must not have additional properties";
      case "anyOf":
        return "must match a schema in anyOf";
      case "boolean":
        return "schema is false";
      case "const":
        return "must be equal to constant";
      case "contains":
        return "must contain at least 1 valid item";
      case "dependencies":
        return `must have properties ${error.params.dependencies.join(", ")} when property ${error.params.property} is present`;
      case "dependentRequired":
        return `must have properties ${error.params.dependencies.join(", ")} when property ${error.params.property} is present`;
      case "enum":
        return "must be equal to one of the allowed values";
      case "exclusiveMaximum":
        return `must be ${error.params.comparison} ${error.params.limit}`;
      case "exclusiveMinimum":
        return `must be ${error.params.comparison} ${error.params.limit}`;
      case "format":
        return `must match format "${error.params.format}"`;
      case "if":
        return `must match "${error.params.failingKeyword}" schema`;
      case "maxItems":
        return `must not have more than ${error.params.limit} items`;
      case "maxLength":
        return `must not have more than ${error.params.limit} characters`;
      case "maxProperties":
        return `must not have more than ${error.params.limit} properties`;
      case "maximum":
        return `must be ${error.params.comparison} ${error.params.limit}`;
      case "minItems":
        return `must not have fewer than ${error.params.limit} items`;
      case "minLength":
        return `must not have fewer than ${error.params.limit} characters`;
      case "minProperties":
        return `must not have fewer than ${error.params.limit} properties`;
      case "minimum":
        return `must be ${error.params.comparison} ${error.params.limit}`;
      case "multipleOf":
        return `must be multiple of ${error.params.multipleOf}`;
      case "not":
        return "must not be valid";
      case "oneOf":
        return "must match exactly one schema in oneOf";
      case "pattern":
        return `must match pattern "${error.params.pattern}"`;
      case "propertyNames":
        return `property names ${error.params.propertyNames.join(", ")} are invalid`;
      case "required":
        return `must have required properties ${error.params.requiredProperties.join(", ")}`;
      case "type":
        return typeof error.params.type === "string" ? `must be ${error.params.type}` : `must be either ${error.params.type.join(" or ")}`;
      case "unevaluatedItems":
        return "must not have unevaluated items";
      case "unevaluatedProperties":
        return "must not have unevaluated properties";
      case "uniqueItems":
        return `must not have duplicate items`;
      case "~refine":
        return error.params.message;
      // deno-coverage-ignore - unreachable
      default:
        return "an unknown validation error occurred";
    }
  }

  // runtime/node_modules/typebox/build/system/locale/_config.mjs
  var locale = en_US;
  function Get2() {
    return locale;
  }

  // runtime/node_modules/typebox/build/type/types/_codec.mjs
  var EncodeBuilder = class {
    constructor(type, decode) {
      this.type = type;
      this.decode = decode;
    }
    Encode(callback) {
      const type = this.type;
      const decode = IsCodec(type) ? (value) => this.decode(type["~codec"].decode(value)) : this.decode;
      const encode = IsCodec(type) ? (value) => type["~codec"].encode(callback(value)) : callback;
      const codec = { decode, encode };
      return memory_exports.Update(this.type, { "~codec": codec }, {});
    }
  };
  var DecodeBuilder = class {
    constructor(type) {
      this.type = type;
    }
    Decode(callback) {
      return new EncodeBuilder(this.type, callback);
    }
  };
  function Codec(type) {
    return new DecodeBuilder(type);
  }
  function Decode(type, callback) {
    return Codec(type).Decode(callback).Encode(() => {
      throw Error("Encode not implemented");
    });
  }
  function Encode(type, callback) {
    return Codec(type).Decode(() => {
      throw Error("Decode not implemented");
    }).Encode(callback);
  }
  function IsCodec(value) {
    return IsSchema(value) && guard_exports.HasPropertyKey(value, "~codec") && guard_exports.IsObject(value["~codec"]) && guard_exports.HasPropertyKey(value["~codec"], "encode") && guard_exports.HasPropertyKey(value["~codec"], "decode");
  }

  // runtime/node_modules/typebox/build/type/types/_immutable.mjs
  function Immutable(type) {
    return AddImmutable(type);
  }
  function IsImmutable(value) {
    return IsSchema(value) && guard_exports.HasPropertyKey(value, "~immutable");
  }

  // runtime/node_modules/typebox/build/type/action/_add_readonly.mjs
  function AddReadonlyDeferred(type, options = {}) {
    return Deferred("AddReadonly", [type], options);
  }
  function AddReadonly(type, options = {}) {
    return AddReadonlyAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/types/_readonly.mjs
  function Readonly(type) {
    return AddReadonly(type);
  }
  function IsReadonly(value) {
    return IsSchema(value) && guard_exports.HasPropertyKey(value, "~readonly");
  }

  // runtime/node_modules/typebox/build/type/types/_refine.mjs
  function RefineAdd(type, refinement) {
    const refinements = IsRefine(type) ? [...type["~refine"], refinement] : [refinement];
    return memory_exports.Update(type, { "~refine": refinements }, {});
  }
  function Refine(...args) {
    const [type, check, error] = arguments_exports.Match(args, {
      3: (type2, check2, error2) => [type2, check2, error2],
      2: (type2, check2) => [type2, check2, () => "Refine Error"]
    });
    return RefineAdd(type, { check, error });
  }
  function IsRefinement(value) {
    return guard_exports.IsObjectNotArray(value) && guard_exports.HasPropertyKey(value, "check") && guard_exports.HasPropertyKey(value, "error") && guard_exports.IsFunction(value.check) && guard_exports.IsFunction(value.error);
  }
  function IsRefine(value) {
    return IsSchema(value) && guard_exports.HasPropertyKey(value, "~refine") && guard_exports.IsArray(value["~refine"]) && guard_exports.Every(value["~refine"], 0, (value2) => IsRefinement(value2));
  }

  // runtime/node_modules/typebox/build/type/types/bigint.mjs
  var BigIntPattern = "-?(?:0|[1-9][0-9]*)n";
  function BigInt2(options) {
    return memory_exports.Create({ "~kind": "BigInt" }, { type: "bigint" }, options);
  }
  function IsBigInt3(value) {
    return IsKind(value, "BigInt");
  }

  // runtime/node_modules/typebox/build/type/types/boolean.mjs
  function Boolean2(options) {
    return memory_exports.Create({ "~kind": "Boolean" }, { type: "boolean" }, options);
  }
  function IsBoolean4(value) {
    return IsKind(value, "Boolean");
  }

  // runtime/node_modules/typebox/build/type/types/identifier.mjs
  function Identifier(name) {
    return memory_exports.Create({ "~kind": "Identifier" }, { name });
  }
  function IsIdentifier2(value) {
    return IsKind(value, "Identifier");
  }

  // runtime/node_modules/typebox/build/type/types/integer.mjs
  var IntegerPattern = "-?(?:0|[1-9][0-9]*)";
  function Integer(options) {
    return memory_exports.Create({ "~kind": "Integer" }, { type: "integer" }, options);
  }
  function IsInteger3(value) {
    return IsKind(value, "Integer");
  }

  // runtime/node_modules/typebox/build/type/types/literal.mjs
  var InvalidLiteralValue = class extends Error {
    constructor(value) {
      super(`Invalid Literal value`);
      Object.defineProperty(this, "cause", {
        value: { value },
        writable: false,
        configurable: false,
        enumerable: false
      });
    }
  };
  function LiteralTypeName(value) {
    return guard_exports.IsBigInt(value) ? "bigint" : guard_exports.IsBoolean(value) ? "boolean" : guard_exports.IsNumber(value) ? "number" : guard_exports.IsString(value) ? "string" : (() => {
      throw new InvalidLiteralValue(value);
    })();
  }
  function Literal(value, options) {
    return memory_exports.Create({ "~kind": "Literal" }, { type: LiteralTypeName(value), const: value }, options);
  }
  function IsLiteralValue(value) {
    return guard_exports.IsBigInt(value) || guard_exports.IsBoolean(value) || guard_exports.IsNumber(value) || guard_exports.IsString(value);
  }
  function IsLiteralBigInt(value) {
    return IsLiteral(value) && guard_exports.IsBigInt(value.const);
  }
  function IsLiteralBoolean(value) {
    return IsLiteral(value) && guard_exports.IsBoolean(value.const);
  }
  function IsLiteralNumber(value) {
    return IsLiteral(value) && guard_exports.IsNumber(value.const);
  }
  function IsLiteralString(value) {
    return IsLiteral(value) && guard_exports.IsString(value.const);
  }
  function IsLiteral(value) {
    return IsKind(value, "Literal");
  }

  // runtime/node_modules/typebox/build/type/types/null.mjs
  function Null(options) {
    return memory_exports.Create({ "~kind": "Null" }, { type: "null" }, options);
  }
  function IsNull3(value) {
    return IsKind(value, "Null");
  }

  // runtime/node_modules/typebox/build/type/types/number.mjs
  var NumberPattern = "-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?";
  function Number2(options) {
    return memory_exports.Create({ "~kind": "Number" }, { type: "number" }, options);
  }
  function IsNumber4(value) {
    return IsKind(value, "Number");
  }

  // runtime/node_modules/typebox/build/type/types/symbol.mjs
  function Symbol2(options) {
    return memory_exports.Create({ "~kind": "Symbol" }, { type: "symbol" }, options);
  }
  function IsSymbol3(value) {
    return IsKind(value, "Symbol");
  }

  // runtime/node_modules/typebox/build/type/types/parameter.mjs
  function Parameter(...args) {
    const [name, extends_, equals] = arguments_exports.Match(args, {
      3: (name2, extends_2, equals2) => [name2, extends_2, equals2],
      2: (name2, extends_2) => [name2, extends_2, extends_2],
      1: (name2) => [name2, Unknown(), Unknown()]
    });
    return memory_exports.Create({ "~kind": "Parameter" }, { name, extends: extends_, equals }, {});
  }
  function IsParameter(value) {
    return IsKind(value, "Parameter");
  }

  // runtime/node_modules/typebox/build/type/types/string.mjs
  var StringPattern = ".*";
  function String2(options) {
    return memory_exports.Create({ "~kind": "String" }, { type: "string" }, options);
  }
  function IsString4(value) {
    return IsKind(value, "String");
  }

  // runtime/node_modules/typebox/build/type/types/union.mjs
  function Union(anyOf, options = {}) {
    return memory_exports.Create({ "~kind": "Union" }, { anyOf }, options);
  }
  function IsUnion(value) {
    return IsKind(value, "Union");
  }
  function UnionOptions(type) {
    return memory_exports.Discard(type, ["~kind", "anyOf"]);
  }

  // runtime/node_modules/typebox/build/type/engine/patterns/pattern.mjs
  function ParsePatternIntoTypes(pattern) {
    const parsed = Pattern(pattern);
    const result = guard_exports.IsEqual(parsed.length, 2) ? parsed[0] : [];
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/template_literal/is_finite.mjs
  function FromLiteral(_value) {
    return true;
  }
  function FromTypesReduce(types) {
    return guard_exports.ShiftLeft(types, (left, right) => FromType(left) ? FromTypesReduce(right) : false, () => true);
  }
  function FromTypes(types) {
    const result = guard_exports.IsEqual(types.length, 0) ? false : FromTypesReduce(types);
    return result;
  }
  function FromType(type) {
    return IsUnion(type) ? FromTypes(type.anyOf) : IsLiteral(type) ? FromLiteral(type.const) : false;
  }
  function IsTemplateLiteralFinite(types) {
    const result = FromTypes(types);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/template_literal/create.mjs
  function TemplateLiteralCreate(pattern) {
    return memory_exports.Create({ ["~kind"]: "TemplateLiteral" }, { type: "string", pattern }, {});
  }

  // runtime/node_modules/typebox/build/type/engine/template_literal/decode.mjs
  function FromLiteralPush(variants, value, result = []) {
    return guard_exports.ShiftLeft(variants, (left, right) => FromLiteralPush(right, value, [...result, `${left}${value}`]), () => result);
  }
  function FromLiteral2(variants, value) {
    return guard_exports.IsEqual(variants.length, 0) ? [`${value}`] : FromLiteralPush(variants, value);
  }
  function FromUnion(variants, types, result = []) {
    return guard_exports.ShiftLeft(types, (left, right) => FromUnion(variants, right, [...result, ...FromType2(variants, left)]), () => result);
  }
  function FromType2(variants, type) {
    const result = IsUnion(type) ? FromUnion(variants, type.anyOf) : IsLiteral(type) ? FromLiteral2(variants, type.const) : Unreachable();
    return result;
  }
  function DecodeFromSpan(variants, types) {
    return guard_exports.ShiftLeft(types, (left, right) => DecodeFromSpan(FromType2(variants, left), right), () => variants);
  }
  function VariantsToLiterals(variants) {
    return variants.map((variant) => Literal(variant));
  }
  function DecodeTypesAsUnion(types) {
    const variants = DecodeFromSpan([], types);
    const literals = VariantsToLiterals(variants);
    const result = Union(literals);
    return result;
  }
  function DecodeTypes(types) {
    return guard_exports.IsEqual(types.length, 0) ? Unreachable() : (
      // Literal('') :
      guard_exports.IsEqual(types.length, 1) && IsLiteral(types[0]) ? types[0] : DecodeTypesAsUnion(types)
    );
  }
  function TemplateLiteralDecodeUnsafe(pattern) {
    const types = ParsePatternIntoTypes(pattern);
    const result = guard_exports.IsEqual(types.length, 0) ? String2() : IsTemplateLiteralFinite(types) ? DecodeTypes(types) : TemplateLiteralCreate(pattern);
    return result;
  }
  function TemplateLiteralDecode(pattern) {
    const decoded = TemplateLiteralDecodeUnsafe(pattern);
    const result = IsTemplateLiteral(decoded) ? String2() : decoded;
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/record/record_create.mjs
  function CreateRecord(key, value) {
    const type = "object";
    const patternProperties = { [key]: value };
    return memory_exports.Create({ ["~kind"]: "Record" }, { type, patternProperties });
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key_any.mjs
  function FromAnyKey(value) {
    return CreateRecord(StringKey, value);
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key_boolean.mjs
  function FromBooleanKey(value) {
    return _Object_({ true: value, false: value });
  }

  // runtime/node_modules/typebox/build/type/types/tuple.mjs
  function Tuple(types, options = {}) {
    const [items, minItems, additionalItems] = [types, types.length, false];
    return memory_exports.Create({ ["~kind"]: "Tuple" }, { type: "array", additionalItems, items, minItems }, options);
  }
  function IsTuple(value) {
    return IsKind(value, "Tuple");
  }
  function TupleOptions(type) {
    return memory_exports.Discard(type, ["~kind", "type", "items", "minItems", "additionalItems"]);
  }

  // runtime/node_modules/typebox/build/type/engine/readonly/instantiate_remove.mjs
  function RemoveReadonlyOperation(type) {
    return memory_exports.Discard(type, ["~readonly"]);
  }
  function RemoveReadonlyAction(type, options) {
    const result = memory_exports.Update(RemoveReadonlyOperation(type), {}, options);
    return result;
  }
  function RemoveReadonlyInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return RemoveReadonlyAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/_remove_readonly.mjs
  function RemoveReadonlyDeferred(type, options = {}) {
    return Deferred("RemoveReadonly", [type], options);
  }
  function RemoveReadonly(type, options = {}) {
    return RemoveReadonlyAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/optional/instantiate_remove.mjs
  function RemoveOptionalOperation(type) {
    return memory_exports.Discard(type, ["~optional"]);
  }
  function RemoveOptionalAction(type, options) {
    const result = memory_exports.Update(RemoveOptionalOperation(type), {}, options);
    return result;
  }
  function RemoveOptionalInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return RemoveOptionalAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/_remove_optional.mjs
  function RemoveOptionalDeferred(type, options = {}) {
    return Deferred("RemoveOptional", [type], options);
  }
  function RemoveOptional(type, options = {}) {
    return RemoveOptionalAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/tuple/to_object.mjs
  function TupleElementsToProperties(types) {
    const result = types.reduceRight((result2, right, index3) => {
      return { [index3]: right, ...result2 };
    }, {});
    return result;
  }
  function TupleToObject(type) {
    const properties = TupleElementsToProperties(type.items);
    const result = _Object_(properties);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/evaluate/composite.mjs
  function IsReadonlyProperty(left, right) {
    return IsReadonly(left) ? IsReadonly(right) ? true : false : false;
  }
  function IsOptionalProperty(left, right) {
    return IsOptional(left) ? IsOptional(right) ? true : false : false;
  }
  function CompositeProperty(left, right) {
    const isReadonly = IsReadonlyProperty(left, right);
    const isOptional = IsOptionalProperty(left, right);
    const evaluated = EvaluateIntersect([left, right]);
    const property = RemoveReadonly(RemoveOptional(evaluated));
    return isReadonly && isOptional ? AddReadonly(AddOptional(property)) : isReadonly && !isOptional ? AddReadonly(property) : !isReadonly && isOptional ? AddOptional(property) : property;
  }
  function CompositePropertyKey(left, right, key) {
    return key in left ? key in right ? CompositeProperty(left[key], right[key]) : left[key] : key in right ? right[key] : Never();
  }
  function CompositeProperties(left, right) {
    const keys = /* @__PURE__ */ new Set([...guard_exports.Keys(right), ...guard_exports.Keys(left)]);
    return [...keys].reduce((result, key) => {
      return { ...result, [key]: CompositePropertyKey(left, right, key) };
    }, {});
  }
  function GetProperties(type) {
    const result = IsObject3(type) ? type.properties : IsTuple(type) ? TupleElementsToProperties(type.items) : Unreachable();
    return result;
  }
  function Composite(left, right) {
    const leftProperties = GetProperties(left);
    const rightProperties = GetProperties(right);
    const properties = CompositeProperties(leftProperties, rightProperties);
    return _Object_(properties);
  }

  // runtime/node_modules/typebox/build/type/engine/evaluate/narrow.mjs
  function Narrow(left, right) {
    const result = Compare(left, right);
    return guard_exports.IsEqual(result, ResultLeftInside) ? left : guard_exports.IsEqual(result, ResultRightInside) ? right : guard_exports.IsEqual(result, ResultEqual) ? right : Never();
  }

  // runtime/node_modules/typebox/build/type/engine/evaluate/distribute.mjs
  function IsObjectLike(type) {
    return IsObject3(type) || IsTuple(type);
  }
  function IsUnionOperand(left, right) {
    const isUnionLeft = IsUnion(left);
    const isUnionRight = IsUnion(right);
    const result = isUnionLeft || isUnionRight;
    return result;
  }
  function DistributeOperation(left, right) {
    const evaluatedLeft = EvaluateType(left);
    const evaluatedRight = EvaluateType(right);
    const isUnionOperand = IsUnionOperand(evaluatedLeft, evaluatedRight);
    const isObjectLeft = IsObjectLike(evaluatedLeft);
    const IsObjectRight = IsObjectLike(evaluatedRight);
    const result = isUnionOperand ? EvaluateIntersect([evaluatedLeft, evaluatedRight]) : isObjectLeft && IsObjectRight ? Composite(evaluatedLeft, evaluatedRight) : isObjectLeft && !IsObjectRight ? evaluatedLeft : !isObjectLeft && IsObjectRight ? evaluatedRight : Narrow(evaluatedLeft, evaluatedRight);
    return result;
  }
  function DistributeType(type, types, result = []) {
    return guard_exports.ShiftLeft(types, (left, right) => DistributeType(type, right, [...result, DistributeOperation(type, left)]), () => guard_exports.IsEqual(result.length, 0) ? [type] : result);
  }
  function DistributeUnion(types, distribution, result = []) {
    return guard_exports.ShiftLeft(types, (left, right) => DistributeUnion(right, distribution, [...result, ...Distribute([left], distribution)]), () => result);
  }
  function Distribute(types, result = []) {
    return guard_exports.ShiftLeft(types, (left, right) => IsUnion(left) ? Distribute(right, DistributeUnion(left.anyOf, result)) : Distribute(right, DistributeType(left, result)), () => result);
  }

  // runtime/node_modules/typebox/build/type/engine/exclude/operation.mjs
  function ExcludeType(left, right) {
    const check = Extends({}, left, right);
    const result = result_exports.IsExtendsTrueLike(check) ? [] : [left];
    return result;
  }
  function ExcludeUnion(types, right) {
    return types.reduce((result, head) => {
      return [...result, ...ExcludeType(head, right)];
    }, []);
  }
  function ExcludeOperation(left, right) {
    const evaluated = EvaluateType(left);
    const canonical = IsUnion(evaluated) ? evaluated.anyOf : [evaluated];
    const remaining = ExcludeUnion(canonical, right);
    const result = EvaluateUnion(remaining);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/evaluate/evaluate.mjs
  function EvaluateDependent(if_, then_, else_) {
    const intersect = Intersect([if_, then_]);
    const excluded = ExcludeOperation(else_, if_);
    const result = EvaluateUnion([intersect, excluded]);
    return result;
  }
  function EvaluateEnum(values) {
    const result = values.map((value) => Literal(value));
    return EvaluateUnion(result);
  }
  function EvaluateIntersect(types) {
    const distribution = Distribute(types);
    const broadend = Broaden(distribution);
    const result = EvaluateUnionFast(broadend);
    return result;
  }
  function EvaluateTemplateLiteral(pattern) {
    const evaluated = TemplateLiteralDecode(pattern);
    const result = EvaluateType(evaluated);
    return result;
  }
  function EvaluateUnion(types) {
    const broadend = Broaden(types);
    const result = EvaluateUnionFast(broadend);
    return result;
  }
  function EvaluateType(type) {
    return IsDependent(type) ? EvaluateDependent(type.if, type.then, type.else) : IsEnum(type) ? EvaluateEnum(type.enum) : IsIntersect(type) ? EvaluateIntersect(type.allOf) : IsTemplateLiteral(type) ? EvaluateTemplateLiteral(type.pattern) : IsUnion(type) ? EvaluateUnion(type.anyOf) : type;
  }
  function EvaluateUnionFast(types) {
    const result = guard_exports.IsEqual(types.length, 1) ? types[0] : guard_exports.IsEqual(types.length, 0) ? Never() : Union(types);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key_enum.mjs
  function FromEnumKey(values, value) {
    const unionKey = EvaluateEnum(values);
    const result = FromKey(unionKey, value);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key_integer.mjs
  function FromIntegerKey(_key, value) {
    const result = CreateRecord(IntegerKey, value);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key_intersect.mjs
  function FromIntersectKey(types, value) {
    const evaluatedKey = EvaluateIntersect(types);
    const result = FromKey(evaluatedKey, value);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key_literal.mjs
  function FromLiteralKey(key, value) {
    return guard_exports.IsString(key) || guard_exports.IsNumber(key) ? _Object_({ [key]: value }) : guard_exports.IsEqual(key, false) ? _Object_({ false: value }) : guard_exports.IsEqual(key, true) ? _Object_({ true: value }) : _Object_({});
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key_number.mjs
  function FromNumberKey(_key, value) {
    const result = CreateRecord(NumberKey, value);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key_string.mjs
  function FromStringKey(key, value) {
    return guard_exports.HasPropertyKey(key, "pattern") && (guard_exports.IsString(key.pattern) || key.pattern instanceof RegExp) ? CreateRecord(key.pattern.toString(), value) : CreateRecord(StringKey, value);
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key_template_literal.mjs
  function FromTemplateKey(pattern, value) {
    const types = ParsePatternIntoTypes(pattern);
    const finite = IsTemplateLiteralFinite(types);
    const result = finite ? FromKey(EvaluateTemplateLiteral(pattern), value) : CreateRecord(pattern, value);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/evaluate/flatten.mjs
  function FlattenType(type) {
    const result = IsUnion(type) ? Flatten(type.anyOf) : [type];
    return result;
  }
  function Flatten(types) {
    return types.reduce((result, type) => {
      return [...result, ...FlattenType(type)];
    }, []);
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key_union.mjs
  function StringOrNumberCheck(types) {
    return types.some((type) => IsString4(type) || IsNumber4(type) || IsInteger3(type));
  }
  function TryBuildRecord(types, value) {
    return guard_exports.IsEqual(StringOrNumberCheck(types), true) ? CreateRecord(StringKey, value) : void 0;
  }
  function CreateProperties(types, value) {
    return types.reduce((result, left) => {
      return IsLiteral(left) && (guard_exports.IsString(left.const) || guard_exports.IsNumber(left.const)) ? { ...result, [left.const]: value } : result;
    }, {});
  }
  function CreateObject(types, value) {
    const properties = CreateProperties(types, value);
    const result = _Object_(properties);
    return result;
  }
  function FromUnionKey(types, value) {
    const flattened = Flatten(types);
    const record = TryBuildRecord(flattened, value);
    return IsSchema(record) ? record : CreateObject(flattened, value);
  }

  // runtime/node_modules/typebox/build/type/engine/record/from_key.mjs
  function FromKey(key, value) {
    const result = IsAny(key) ? FromAnyKey(value) : IsBoolean4(key) ? FromBooleanKey(value) : IsEnum(key) ? FromEnumKey(key.enum, value) : IsInteger3(key) ? FromIntegerKey(key, value) : IsIntersect(key) ? FromIntersectKey(key.allOf, value) : IsLiteral(key) ? FromLiteralKey(key.const, value) : IsNumber4(key) ? FromNumberKey(key, value) : IsUnion(key) ? FromUnionKey(key.anyOf, value) : IsString4(key) ? FromStringKey(key, value) : IsTemplateLiteral(key) ? FromTemplateKey(key.pattern, value) : _Object_({});
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/record/instantiate.mjs
  function RecordAction(key, value, options) {
    const result = CanInstantiate([key]) ? memory_exports.Update(FromKey(key, value), {}, options) : RecordDeferred(key, value, options);
    return result;
  }
  function RecordInstantiate(context, state2, key, value, options) {
    const instantiatedKey = InstantiateType(context, state2, key);
    const instantiatedValue = InstantiateType(context, state2, value);
    return RecordAction(instantiatedKey, instantiatedValue, options);
  }

  // runtime/node_modules/typebox/build/type/types/record.mjs
  var IntegerKey = `^${IntegerPattern}$`;
  var NumberKey = `^${NumberPattern}$`;
  var StringKey = `^${StringPattern}$`;
  function RecordDeferred(key, value, options = {}) {
    return Deferred("Record", [key, value], options);
  }
  function Record(key, value, options = {}) {
    return RecordAction(key, value, options);
  }
  function RecordFromPattern(pattern, value) {
    return CreateRecord(pattern, value);
  }
  function RecordPatternToType(pattern) {
    const result = guard_exports.IsEqual(pattern, StringKey) ? String2() : guard_exports.IsEqual(pattern, IntegerKey) ? Integer() : guard_exports.IsEqual(pattern, NumberKey) ? Number2() : TemplateLiteralDecodeUnsafe(pattern);
    return result;
  }
  function RecordPattern(type) {
    return guard_exports.Keys(type.patternProperties)[0];
  }
  function RecordKey(type) {
    const pattern = RecordPattern(type);
    const result = RecordPatternToType(pattern);
    return result;
  }
  function RecordValue(type) {
    return type.patternProperties[RecordPattern(type)];
  }
  function IsRecord(value) {
    return IsKind(value, "Record");
  }

  // runtime/node_modules/typebox/build/type/types/rest.mjs
  function Rest(type) {
    return memory_exports.Create({ "~kind": "Rest" }, { type: "rest", items: type }, {});
  }
  function IsRest(value) {
    return IsKind(value, "Rest");
  }

  // runtime/node_modules/typebox/build/type/types/this.mjs
  function This(options) {
    return memory_exports.Create({ ["~kind"]: "This" }, { $ref: "#" }, options);
  }
  function IsThis(value) {
    return IsKind(value, "This");
  }

  // runtime/node_modules/typebox/build/type/types/undefined.mjs
  function Undefined(options) {
    return memory_exports.Create({ "~kind": "Undefined" }, { type: "undefined" }, options);
  }
  function IsUndefined3(value) {
    return IsKind(value, "Undefined");
  }

  // runtime/node_modules/typebox/build/type/types/void.mjs
  function Void(options) {
    return memory_exports.Create({ "~kind": "Void" }, { type: "void" }, options);
  }
  function IsVoid(value) {
    return IsKind(value, "Void");
  }

  // runtime/node_modules/typebox/build/type/script/mapping.mjs
  function IntrinsicOrCall(ref, parameters) {
    return guard_exports.IsEqual(ref, "Array") ? _Array_(parameters[0]) : guard_exports.IsEqual(ref, "Capitalize") ? CapitalizeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "ConstructorParameters") ? ConstructorParametersDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Evaluate") ? EvaluateDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Exclude") ? ExcludeDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Extract") ? ExtractDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Index") ? IndexDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "InstanceType") ? InstanceTypeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Lowercase") ? LowercaseDeferred(parameters[0]) : guard_exports.IsEqual(ref, "NonNullable") ? NonNullableDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Omit") ? OmitDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Parameters") ? ParametersDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Partial") ? PartialDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Pick") ? PickDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Readonly") ? ReadonlyObjectDeferred(parameters[0]) : guard_exports.IsEqual(ref, "KeyOf") ? KeyOfDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Record") ? RecordDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Required") ? RequiredDeferred(parameters[0]) : guard_exports.IsEqual(ref, "ReturnType") ? ReturnTypeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Uncapitalize") ? UncapitalizeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Uppercase") ? UppercaseDeferred(parameters[0]) : CallConstruct(Ref(ref), parameters);
  }
  function Unreachable2() {
    throw Error("Unreachable");
  }
  var DelimitedDecode = (input, result = []) => {
    return input.reduce((result2, left) => {
      return guard_exports.IsArray(left) && guard_exports.IsEqual(left.length, 2) ? [...result2, left[0]] : [...result2, left];
    }, []);
  };
  var Delimited = (input) => {
    const [left, right] = input;
    return DelimitedDecode([...left, ...right]);
  };
  function GenericParameterExtendsEqualsMapping(input) {
    return Parameter(input[0], input[2], input[4]);
  }
  function GenericParameterExtendsMapping(input) {
    return Parameter(input[0], input[2], input[2]);
  }
  function GenericParameterEqualsMapping(input) {
    return Parameter(input[0], Unknown(), input[2]);
  }
  function GenericParameterIdentifierMapping(input) {
    return Parameter(input, Unknown(), Unknown());
  }
  function GenericParameterMapping(input) {
    return input;
  }
  function GenericParameterListMapping(input) {
    return Delimited(input);
  }
  function GenericParametersMapping(input) {
    return input[1];
  }
  function GenericCallArgumentListMapping(input) {
    return Delimited(input);
  }
  function GenericCallArgumentsMapping(input) {
    return input[1];
  }
  function GenericCallMapping(input) {
    return IntrinsicOrCall(input[0], input[1]);
  }
  function OptionalSemiColonMapping(input) {
    return null;
  }
  function KeywordStringMapping(input) {
    return String2();
  }
  function KeywordNumberMapping(input) {
    return Number2();
  }
  function KeywordBooleanMapping(input) {
    return Boolean2();
  }
  function KeywordUndefinedMapping(input) {
    return Undefined();
  }
  function KeywordNullMapping(input) {
    return Null();
  }
  function KeywordIntegerMapping(input) {
    return Integer();
  }
  function KeywordBigIntMapping(input) {
    return BigInt2();
  }
  function KeywordUnknownMapping(input) {
    return Unknown();
  }
  function KeywordAnyMapping(input) {
    return Any();
  }
  function KeywordObjectMapping(input) {
    return _Object_({});
  }
  function KeywordNeverMapping(input) {
    return Never();
  }
  function KeywordSymbolMapping(input) {
    return Symbol2();
  }
  function KeywordVoidMapping(input) {
    return Void();
  }
  function KeywordThisMapping(input) {
    return This();
  }
  function LiteralBigIntMapping(input) {
    return Literal(BigInt(input));
  }
  function LiteralBooleanMapping(input) {
    return Literal(guard_exports.IsEqual(input, "true"));
  }
  function LiteralNumberMapping(input) {
    return Literal(parseFloat(input));
  }
  function LiteralStringMapping(input) {
    return Literal(input);
  }
  function TemplateInterpolateMapping(input) {
    return input[1];
  }
  function TemplateSpanMapping(input) {
    return Literal(input);
  }
  function TemplateBodyMapping(input) {
    return guard_exports.IsEqual(input.length, 3) ? [input[0], input[1], ...input[2]] : [input[0]];
  }
  function TemplateLiteralTypesMapping(input) {
    return input[1];
  }
  function TemplateLiteralMapping(input) {
    return TemplateLiteralDeferred(input);
  }
  function DependentMapping(input) {
    return guard_exports.IsEqual(input.length, 6) ? Dependent(input[1], input[3], input[5]) : Dependent(input[1], input[3], Unknown());
  }
  function KeyOfMapping(input) {
    return input.length > 0;
  }
  function IndexArrayMapping(input) {
    return input.reduce((result, current) => {
      return guard_exports.IsEqual(current.length, 3) ? [...result, [current[1]]] : [...result, []];
    }, []);
  }
  function ExtendsMapping(input) {
    return guard_exports.IsEqual(input.length, 6) ? [input[1], input[3], input[5]] : [];
  }
  function BaseMapping(input) {
    return guard_exports.IsArray(input) && guard_exports.IsEqual(input.length, 3) ? input[1] : input;
  }
  function WithMapping(input) {
    return guard_exports.IsEqual(input.length, 2) ? input[1] : [];
  }
  function FactorIndexArray(Type2, indexArray) {
    return indexArray.reduce((result, left) => {
      const _left = left;
      return guard_exports.IsEqual(_left.length, 1) ? IndexDeferred(result, _left[0]) : guard_exports.IsEqual(_left.length, 0) ? _Array_(result) : Unreachable2();
    }, Type2);
  }
  function FactorExtends(type, extend) {
    return guard_exports.IsEqual(extend.length, 3) ? ConditionalDeferred(type, extend[0], extend[1], extend[2]) : type;
  }
  function FactorWith(type, withClause) {
    return guard_exports.IsArray(withClause) && guard_exports.IsEqual(withClause.length, 0) ? type : WithDeferred(type, withClause);
  }
  function FactorMapping(input) {
    const [keyOf, type, indexArray, extend, withClause] = input;
    return FactorWith(keyOf ? FactorExtends(KeyOfDeferred(FactorIndexArray(type, indexArray)), extend) : FactorExtends(FactorIndexArray(type, indexArray), extend), withClause);
  }
  function ExprBinaryMapping(left, rest) {
    return guard_exports.IsEqual(rest.length, 3) ? (() => {
      const [operator, right, next] = rest;
      const Schema = ExprBinaryMapping(right, next);
      if (guard_exports.IsEqual(operator, "&")) {
        return IsIntersect(Schema) ? Intersect([left, ...Schema.allOf]) : Intersect([left, Schema]);
      }
      if (guard_exports.IsEqual(operator, "|")) {
        return IsUnion(Schema) ? Union([left, ...Schema.anyOf]) : Union([left, Schema]);
      }
      Unreachable2();
    })() : left;
  }
  function ExprTermTailMapping(input) {
    return input;
  }
  function ExprTermMapping(input) {
    const [left, rest] = input;
    return ExprBinaryMapping(left, rest);
  }
  function ExprTailMapping(input) {
    return input;
  }
  function ExprMapping(input) {
    const [left, rest] = input;
    return ExprBinaryMapping(left, rest);
  }
  function ExprReadonlyMapping(input) {
    return AddImmutableDeferred(input[1]);
  }
  function ExprPipeMapping(input) {
    return input[1];
  }
  function GenericTypeMapping(input) {
    return Generic(input[0], input[2]);
  }
  function InferTypeMapping(input) {
    return guard_exports.IsEqual(input.length, 4) ? Infer(input[1], input[3]) : guard_exports.IsEqual(input.length, 2) ? Infer(input[1], Unknown()) : Unreachable2();
  }
  function TypeMapping(input) {
    return input;
  }
  function PropertyKeyNumberMapping(input) {
    return `${input}`;
  }
  function PropertyKeyIdentMapping(input) {
    return input;
  }
  function PropertyKeyQuotedMapping(input) {
    return input;
  }
  function PropertyKeyIndexMapping(input) {
    return IsInteger3(input[3]) ? IntegerKey : IsNumber4(input[3]) ? NumberKey : IsSymbol3(input[3]) ? StringKey : IsString4(input[3]) ? StringKey : Unreachable2();
  }
  function PropertyKeyMapping(input) {
    return input;
  }
  function ReadonlyMapping(input) {
    return input.length > 0;
  }
  function OptionalMapping(input) {
    return input.length > 0;
  }
  function PropertyMapping(input) {
    const [isReadonly, key, isOptional, _colon, type] = input;
    return {
      [key]: isReadonly && isOptional ? AddReadonlyDeferred(AddOptionalDeferred(type)) : isReadonly && !isOptional ? AddReadonlyDeferred(type) : !isReadonly && isOptional ? AddOptionalDeferred(type) : type
    };
  }
  function PropertyDelimiterMapping(input) {
    return input;
  }
  function PropertyListMapping(input) {
    return Delimited(input);
  }
  function PropertiesReduce(propertyList) {
    return propertyList.reduce((result, left) => {
      const isPatternProperties = guard_exports.HasPropertyKey(left, IntegerKey) || guard_exports.HasPropertyKey(left, NumberKey) || guard_exports.HasPropertyKey(left, StringKey);
      return isPatternProperties ? [result[0], memory_exports.Assign(result[1], left)] : [memory_exports.Assign(result[0], left), result[1]];
    }, [{}, {}]);
  }
  function PropertiesMapping(input) {
    return PropertiesReduce(input[1]);
  }
  function _Object_Mapping(input) {
    const [properties, patternProperties] = input;
    const options = guard_exports.IsEqual(guard_exports.Keys(patternProperties).length, 0) ? {} : { patternProperties };
    return _Object_(properties, options);
  }
  function ElementNamedMapping(input) {
    return guard_exports.IsEqual(input.length, 5) ? AddReadonlyDeferred(AddOptionalDeferred(input[4])) : guard_exports.IsEqual(input.length, 3) ? input[2] : guard_exports.IsEqual(input.length, 4) ? guard_exports.IsEqual(input[2], "readonly") ? AddReadonlyDeferred(input[3]) : AddOptionalDeferred(input[3]) : Unreachable2();
  }
  function ElementReadonlyOptionalMapping(input) {
    return AddReadonlyDeferred(AddOptionalDeferred(input[1]));
  }
  function ElementReadonlyMapping(input) {
    return AddReadonlyDeferred(input[1]);
  }
  function ElementOptionalMapping(input) {
    return AddOptionalDeferred(input[0]);
  }
  function ElementBaseMapping(input) {
    return input;
  }
  function ElementMapping(input) {
    return guard_exports.IsEqual(input.length, 2) ? Rest(input[1]) : guard_exports.IsEqual(input.length, 1) ? input[0] : Unreachable2();
  }
  function ElementListMapping(input) {
    return Delimited(input);
  }
  function _Tuple_Mapping(input) {
    return Tuple(input[1]);
  }
  function ParameterReadonlyOptionalMapping(input) {
    return AddReadonlyDeferred(AddOptionalDeferred(input[4]));
  }
  function ParameterReadonlyMapping(input) {
    return AddReadonlyDeferred(input[3]);
  }
  function ParameterOptionalMapping(input) {
    return AddOptionalDeferred(input[3]);
  }
  function ParameterTypeMapping(input) {
    return input[2];
  }
  function ParameterBaseMapping(input) {
    return input;
  }
  function ParameterMapping(input) {
    return guard_exports.IsEqual(input.length, 2) ? Rest(input[1]) : guard_exports.IsEqual(input.length, 1) ? input[0] : Unreachable2();
  }
  function ParameterListMapping(input) {
    return Delimited(input);
  }
  function _Function_Mapping(input) {
    return _Function_(input[1], input[4]);
  }
  function _Constructor_Mapping(input) {
    return Constructor(input[2], input[5]);
  }
  function ApplyReadonly(state2, type) {
    return guard_exports.IsEqual(state2, "remove") ? RemoveReadonlyDeferred(type) : guard_exports.IsEqual(state2, "add") ? AddReadonlyDeferred(type) : type;
  }
  function MappedReadonlyMapping(input) {
    return guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "-") ? "remove" : guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "+") ? "add" : guard_exports.IsEqual(input.length, 1) ? "add" : "none";
  }
  function ApplyOptional(state2, type) {
    return guard_exports.IsEqual(state2, "remove") ? RemoveOptionalDeferred(type) : guard_exports.IsEqual(state2, "add") ? AddOptionalDeferred(type) : type;
  }
  function MappedOptionalMapping(input) {
    return guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "-") ? "remove" : guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "+") ? "add" : guard_exports.IsEqual(input.length, 1) ? "add" : "none";
  }
  function MappedAsMapping(input) {
    return guard_exports.IsEqual(input.length, 2) ? [input[1]] : [];
  }
  function _Mapped_Mapping(input) {
    return guard_exports.IsArray(input[6]) && guard_exports.IsEqual(input[6].length, 1) ? MappedDeferred(Identifier(input[3]), input[5], input[6][0], ApplyReadonly(input[1], ApplyOptional(input[8], input[10]))) : MappedDeferred(Identifier(input[3]), input[5], Ref(input[3]), ApplyReadonly(input[1], ApplyOptional(input[8], input[10])));
  }
  function ReferenceMapping(input) {
    return Ref(input);
  }
  function WithBigIntMapping(input) {
    return BigInt(input);
  }
  function WithNumberMapping(input) {
    return parseFloat(input);
  }
  function WithBooleanMapping(input) {
    return guard_exports.IsEqual(input, "true");
  }
  function WithStringMapping(input) {
    return input;
  }
  function WithNullMapping(input) {
    return null;
  }
  function WithUndefinedMapping(input) {
    return void 0;
  }
  function WithPropertyMapping(input) {
    return { [input[0]]: input[2] };
  }
  function WithPropertyListMapping(input) {
    return Delimited(input);
  }
  function WithObjectMappingReduce(propertyList) {
    return propertyList.reduce((result, left) => {
      return memory_exports.Assign(result, left);
    }, {});
  }
  function WithObjectMapping(input) {
    return WithObjectMappingReduce(input[1]);
  }
  function WithElementListMapping(input) {
    return Delimited(input);
  }
  function WithArrayMapping(input) {
    return input[1];
  }
  function WithValueMapping(input) {
    return input;
  }
  function PatternBigIntMapping(input) {
    return BigInt2();
  }
  function PatternStringMapping(input) {
    return String2();
  }
  function PatternNumberMapping(input) {
    return Number2();
  }
  function PatternIntegerMapping(input) {
    return Integer();
  }
  function PatternNeverMapping(input) {
    return Never();
  }
  function PatternTextMapping(input) {
    return Literal(input);
  }
  function PatternBaseMapping(input) {
    return input;
  }
  function PatternGroupMapping(input) {
    return Union(input[1]);
  }
  function PatternUnionMapping(input) {
    return input.length === 3 ? [...input[0], ...input[2]] : input.length === 1 ? [...input[0]] : [];
  }
  function PatternTermMapping(input) {
    return [input[0], ...input[1]];
  }
  function PatternBodyMapping(input) {
    return input;
  }
  function PatternMapping(input) {
    return input[1];
  }
  function InterfaceDeclarationHeritageListMapping(input) {
    return Delimited(input);
  }
  function InterfaceDeclarationHeritageMapping(input) {
    return guard_exports.IsEqual(input.length, 2) ? input[1] : [];
  }
  function InterfaceDeclarationGenericMapping(input) {
    const parameters = input[2];
    const heritage = input[3];
    const [properties, patternProperties] = input[4];
    const options = guard_exports.IsEqual(guard_exports.Keys(patternProperties).length, 0) ? {} : { patternProperties };
    return { [input[1]]: Generic(parameters, InterfaceDeferred(heritage, properties, options)) };
  }
  function InterfaceDeclarationMapping(input) {
    const heritage = input[2];
    const [properties, patternProperties] = input[3];
    const options = guard_exports.IsEqual(guard_exports.Keys(patternProperties).length, 0) ? {} : { patternProperties };
    return { [input[1]]: InterfaceDeferred(heritage, properties, options) };
  }
  function TypeAliasDeclarationGenericMapping(input) {
    return { [input[1]]: Generic(input[2], input[4]) };
  }
  function TypeAliasDeclarationMapping(input) {
    return { [input[1]]: input[3] };
  }
  function ExportKeywordMapping(input) {
    return null;
  }
  function ModuleDeclarationDelimiterMapping(input) {
    return input;
  }
  function ModuleDeclarationListMapping(input) {
    return PropertiesReduce(Delimited(input));
  }
  function ModuleDeclarationMapping(input) {
    return input[1];
  }
  function ModuleMapping(input) {
    const moduleDeclaration = input[0];
    const moduleDeclarationList = input[1];
    return ModuleDeferred(memory_exports.Assign(moduleDeclaration, moduleDeclarationList[0]));
  }
  function ScriptMapping(input) {
    return input;
  }

  // runtime/node_modules/typebox/build/type/script/token/internal/match.mjs
  function IsMatch(value) {
    return IsEqual(value.length, 2);
  }
  function Match2(input, ok, fail) {
    return IsMatch(input) ? ok(input[0], input[1]) : fail();
  }

  // runtime/node_modules/typebox/build/type/script/token/internal/take.mjs
  function TakeVariant(variant, input) {
    return IsEqual(input.indexOf(variant), 0) ? [variant, input.slice(variant.length)] : [];
  }
  function Take(variants, input) {
    for (let i = 0; i < variants.length; i++) {
      const result = TakeVariant(variants[i], input);
      if (IsMatch(result))
        return result;
    }
    return [];
  }

  // runtime/node_modules/typebox/build/type/script/token/internal/char.mjs
  function Range(start, end) {
    return Array.from({ length: end - start + 1 }, (_, i) => String.fromCharCode(start + i));
  }
  var Alpha = [
    ...Range(97, 122),
    // Lowercase
    ...Range(65, 90)
    // Uppercase
  ];
  var Zero = "0";
  var NonZero = Range(49, 57);
  var Digit = [Zero, ...NonZero];
  var WhiteSpace = " ";
  var NewLine = "\n";
  var UnderScore = "_";
  var Dot = ".";
  var DollarSign = "$";
  var Hyphen = "-";

  // runtime/node_modules/typebox/build/type/script/token/internal/trim.mjs
  var LineComment = "//";
  var OpenComment = "/*";
  var CloseComment = "*/";
  function DiscardMultilineComment(input) {
    const index3 = input.indexOf(CloseComment);
    const result = IsEqual(index3, -1) ? "" : input.slice(index3 + 2);
    return result;
  }
  function DiscardLineComment(input) {
    const index3 = input.indexOf(NewLine);
    const result = IsEqual(index3, -1) ? "" : input.slice(index3);
    return result;
  }
  function TrimStartUntilNewline(input) {
    return input.replace(/^[ \t\r\f\v]+/, "");
  }
  function TrimWhitespace(input) {
    const trimmed = TrimStartUntilNewline(input);
    return trimmed.startsWith(OpenComment) ? TrimWhitespace(DiscardMultilineComment(trimmed.slice(2))) : trimmed.startsWith(LineComment) ? TrimWhitespace(DiscardLineComment(trimmed.slice(2))) : trimmed;
  }
  function Trim(input) {
    const trimmed = input.trimStart();
    return trimmed.startsWith(OpenComment) ? Trim(DiscardMultilineComment(trimmed.slice(2))) : trimmed.startsWith(LineComment) ? Trim(DiscardLineComment(trimmed.slice(2))) : trimmed;
  }

  // runtime/node_modules/typebox/build/type/script/token/internal/optional.mjs
  function Optional2(value, input) {
    return Match2(Take([value], input), (Optional4, Rest2) => [Optional4, Rest2], () => ["", input]);
  }

  // runtime/node_modules/typebox/build/type/script/token/internal/many.mjs
  function IsDiscard(discard, input) {
    return discard.includes(input);
  }
  function Many(allowed, discard, input, result = "") {
    return Match2(Take(allowed, input), (Char, Rest2) => IsDiscard(discard, Char) ? Many(allowed, discard, Rest2, result) : Many(allowed, discard, Rest2, `${result}${Char}`), () => [result, input]);
  }

  // runtime/node_modules/typebox/build/type/script/token/unsigned_integer.mjs
  function TakeNonZero(input) {
    return Take(NonZero, input);
  }
  var AllowedDigits = [...Digit, UnderScore];
  function TakeDigits(input) {
    return Many(AllowedDigits, [UnderScore], input);
  }
  function TakeUnsignedInteger(input) {
    return Match2(Take([Zero], input), (Zero2, ZeroRest) => [Zero2, ZeroRest], () => Match2(
      TakeNonZero(input),
      (NonZero2, NonZeroRest) => Match2(TakeDigits(NonZeroRest), (Digits, DigitsRest) => [`${NonZero2}${Digits}`, DigitsRest], () => []),
      // fail: did not match Digits
      () => []
    ));
  }
  function UnsignedInteger(input) {
    return TakeUnsignedInteger(Trim(input));
  }

  // runtime/node_modules/typebox/build/type/script/token/integer.mjs
  function TakeSign(input) {
    return Optional2(Hyphen, input);
  }
  function TakeSignedInteger(input) {
    return Match2(
      TakeSign(input),
      (Sign, SignRest) => Match2(UnsignedInteger(SignRest), (UnsignedInteger2, UnsignedIntegerRest) => [`${Sign}${UnsignedInteger2}`, UnsignedIntegerRest], () => []),
      // fail: did not match unsigned integer
      () => []
    );
  }
  function Integer2(input) {
    return TakeSignedInteger(Trim(input));
  }

  // runtime/node_modules/typebox/build/type/script/token/bigint.mjs
  function TakeBigInt(input) {
    return Match2(
      Integer2(input),
      (Integer3, IntegerRest) => Match2(Take(["n"], IntegerRest), (_N, NRest) => [`${Integer3}`, NRest], () => []),
      // fail: did not match 'n'
      () => []
    );
  }
  function BigInt3(input) {
    return TakeBigInt(input);
  }

  // runtime/node_modules/typebox/build/type/script/token/const.mjs
  function TakeConst(const_, input) {
    return Take([const_], input);
  }
  function Const(const_, input) {
    return IsEqual(const_, "") ? ["", input] : const_.startsWith(NewLine) ? TakeConst(const_, TrimWhitespace(input)) : const_.startsWith(WhiteSpace) ? TakeConst(const_, input) : TakeConst(const_, Trim(input));
  }

  // runtime/node_modules/typebox/build/type/script/token/ident.mjs
  var Initial = [...Alpha, UnderScore, DollarSign];
  function TakeInitial(input) {
    return Take(Initial, input);
  }
  var Remaining = [...Initial, ...Digit];
  function TakeRemaining(input, result = "") {
    return Match2(Take(Remaining, input), (Remaining2, RemainingRest) => TakeRemaining(RemainingRest, `${result}${Remaining2}`), () => [result, input]);
  }
  function TakeIdent(input) {
    return Match2(
      TakeInitial(input),
      (Initial2, InitialRest) => Match2(TakeRemaining(InitialRest), (Remaining2, RemainingRest) => [`${Initial2}${Remaining2}`, RemainingRest], () => []),
      // fail: did not match Remaining
      () => []
    );
  }
  function Ident(input) {
    return TakeIdent(Trim(input));
  }

  // runtime/node_modules/typebox/build/type/script/token/unsigned_number.mjs
  var AllowedDigits2 = [...Digit, UnderScore];
  function IsLeadingDot(input) {
    return IsMatch(Take([Dot], input));
  }
  function TakeFractional(input) {
    return Match2(Many(AllowedDigits2, [UnderScore], input), (Digits, DigitsRest) => IsEqual(Digits, "") ? [] : [Digits, DigitsRest], () => []);
  }
  function LeadingDot(input) {
    return Match2(
      Take([Dot], input),
      (Dot2, DotRest) => Match2(TakeFractional(DotRest), (Fractional, FractionalRest) => [`0${Dot2}${Fractional}`, FractionalRest], () => []),
      // fail: did not match Fractional
      () => []
    );
  }
  function LeadingInteger(input) {
    return Match2(
      UnsignedInteger(input),
      (Integer3, IntegerRest) => Match2(
        Take([Dot], IntegerRest),
        (Dot2, DotRest) => Match2(TakeFractional(DotRest), (Fractional, FractionalRest) => [`${Integer3}${Dot2}${Fractional}`, FractionalRest], () => [`${Integer3}`, DotRest]),
        // fail: did not match Fractional, use Integer
        () => [`${Integer3}`, IntegerRest]
      ),
      // fail: did not match Dot, use Integer
      () => []
    );
  }
  function TakeUnsignedNumber(input) {
    return IsLeadingDot(input) ? LeadingDot(input) : LeadingInteger(input);
  }
  function UnsignedNumber(input) {
    return TakeUnsignedNumber(Trim(input));
  }

  // runtime/node_modules/typebox/build/type/script/token/number.mjs
  function TakeSign2(input) {
    return Optional2(Hyphen, input);
  }
  function TakeSignedNumber(input) {
    return Match2(
      TakeSign2(input),
      (Sign, SignRest) => Match2(UnsignedNumber(SignRest), (UnsignedInteger2, UnsignedIntegerRest) => [`${Sign}${UnsignedInteger2}`, UnsignedIntegerRest], () => []),
      // fail: did not match unsigned integer
      () => []
    );
  }
  function Number3(input) {
    return TakeSignedNumber(Trim(input));
  }

  // runtime/node_modules/typebox/build/type/script/token/until.mjs
  function TakeOne(input) {
    const result = IsEqual(input, "") ? [] : [input.slice(0, 1), input.slice(1)];
    return result;
  }
  function IsInputMatchSentinal(end, input) {
    return ShiftLeft(end, (left, right) => input.startsWith(left) ? true : IsInputMatchSentinal(right, input), () => false);
  }
  function Until(end, input, result = "") {
    return Match2(
      TakeOne(input),
      (One, Rest2) => IsInputMatchSentinal(end, input) ? [result, input] : Until(end, Rest2, `${result}${One}`),
      () => []
    );
  }

  // runtime/node_modules/typebox/build/type/script/token/span.mjs
  function MultiLine(start, end, input) {
    return Match2(
      Take([start], input),
      (_, Rest2) => Match2(
        Until([end], Rest2),
        (Until2, UntilRest) => Match2(Take([end], UntilRest), (_2, Rest3) => [`${Until2}`, Rest3], () => []),
        // fail: did not match End
        () => []
      ),
      // fail: did not match Until
      () => []
    );
  }
  function SingleLine(start, end, input) {
    return Match2(
      Take([start], input),
      (_, Rest2) => Match2(
        Until([NewLine, end], Rest2),
        (Until2, UntilRest) => Match2(Take([end], UntilRest), (_2, EndRest) => [`${Until2}`, EndRest], () => []),
        // fail: did not match End
        () => []
      ),
      // fail: did not match Until
      () => []
    );
  }
  function Span(start, end, multiLine, input) {
    return multiLine ? MultiLine(start, end, Trim(input)) : SingleLine(start, end, Trim(input));
  }

  // runtime/node_modules/typebox/build/type/script/token/string.mjs
  function TakeInitial2(quotes, input) {
    return Take(quotes, input);
  }
  function TakeSpan(quote, input) {
    return Span(quote, quote, false, input);
  }
  function TakeString(quotes, input) {
    return Match2(TakeInitial2(quotes, input), (Initial2, InitialRest) => TakeSpan(Initial2, `${Initial2}${InitialRest}`), () => []);
  }
  function String3(quotes, input) {
    return TakeString(quotes, Trim(input));
  }

  // runtime/node_modules/typebox/build/type/script/token/until_1.mjs
  function Until_1(end, input) {
    return Match2(Until(end, input), (Until2, UntilRest) => IsEqual(Until2, "") ? [] : [Until2, UntilRest], () => []);
  }

  // runtime/node_modules/typebox/build/type/script/parser.mjs
  var If2 = (result, left, right = () => []) => result.length === 2 ? left(result) : right();
  var GenericParameterExtendsEquals = (input) => If2(If2(Ident(input), ([_0, input2]) => If2(Const("extends", input2), ([_1, input3]) => If2(Type(input3), ([_2, input4]) => If2(Const("=", input4), ([_3, input5]) => If2(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [GenericParameterExtendsEqualsMapping(_0), input2]);
  var GenericParameterExtends = (input) => If2(If2(Ident(input), ([_0, input2]) => If2(Const("extends", input2), ([_1, input3]) => If2(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParameterExtendsMapping(_0), input2]);
  var GenericParameterEquals = (input) => If2(If2(Ident(input), ([_0, input2]) => If2(Const("=", input2), ([_1, input3]) => If2(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParameterEqualsMapping(_0), input2]);
  var GenericParameterIdentifier = (input) => If2(Ident(input), ([_0, input2]) => [GenericParameterIdentifierMapping(_0), input2]);
  var GenericParameter = (input) => If2(If2(GenericParameterExtendsEquals(input), ([_0, input2]) => [_0, input2], () => If2(GenericParameterExtends(input), ([_0, input2]) => [_0, input2], () => If2(GenericParameterEquals(input), ([_0, input2]) => [_0, input2], () => If2(GenericParameterIdentifier(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [GenericParameterMapping(_0), input2]);
  var GenericParameterList_0 = (input, result = []) => If2(If2(GenericParameter(input), ([_0, input2]) => If2(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => GenericParameterList_0(input2, [...result, _0]), () => [result, input]);
  var GenericParameterList = (input) => If2(If2(GenericParameterList_0(input), ([_0, input2]) => If2(If2(If2(GenericParameter(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If2([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericParameterListMapping(_0), input2]);
  var GenericParameters = (input) => If2(If2(Const("<", input), ([_0, input2]) => If2(GenericParameterList(input2), ([_1, input3]) => If2(Const(">", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParametersMapping(_0), input2]);
  var GenericCallArgumentList_0 = (input, result = []) => If2(If2(Type(input), ([_0, input2]) => If2(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => GenericCallArgumentList_0(input2, [...result, _0]), () => [result, input]);
  var GenericCallArgumentList = (input) => If2(If2(GenericCallArgumentList_0(input), ([_0, input2]) => If2(If2(If2(Type(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If2([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericCallArgumentListMapping(_0), input2]);
  var GenericCallArguments = (input) => If2(If2(Const("<", input), ([_0, input2]) => If2(GenericCallArgumentList(input2), ([_1, input3]) => If2(Const(">", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericCallArgumentsMapping(_0), input2]);
  var GenericCall = (input) => If2(If2(Ident(input), ([_0, input2]) => If2(GenericCallArguments(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericCallMapping(_0), input2]);
  var OptionalSemiColon = (input) => If2(If2(If2(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [OptionalSemiColonMapping(_0), input2]);
  var KeywordString = (input) => If2(Const("string", input), ([_0, input2]) => [KeywordStringMapping(_0), input2]);
  var KeywordNumber = (input) => If2(Const("number", input), ([_0, input2]) => [KeywordNumberMapping(_0), input2]);
  var KeywordBoolean = (input) => If2(Const("boolean", input), ([_0, input2]) => [KeywordBooleanMapping(_0), input2]);
  var KeywordUndefined = (input) => If2(Const("undefined", input), ([_0, input2]) => [KeywordUndefinedMapping(_0), input2]);
  var KeywordNull = (input) => If2(Const("null", input), ([_0, input2]) => [KeywordNullMapping(_0), input2]);
  var KeywordInteger = (input) => If2(Const("integer", input), ([_0, input2]) => [KeywordIntegerMapping(_0), input2]);
  var KeywordBigInt = (input) => If2(Const("bigint", input), ([_0, input2]) => [KeywordBigIntMapping(_0), input2]);
  var KeywordUnknown = (input) => If2(Const("unknown", input), ([_0, input2]) => [KeywordUnknownMapping(_0), input2]);
  var KeywordAny = (input) => If2(Const("any", input), ([_0, input2]) => [KeywordAnyMapping(_0), input2]);
  var KeywordObject = (input) => If2(Const("object", input), ([_0, input2]) => [KeywordObjectMapping(_0), input2]);
  var KeywordNever = (input) => If2(Const("never", input), ([_0, input2]) => [KeywordNeverMapping(_0), input2]);
  var KeywordSymbol = (input) => If2(Const("symbol", input), ([_0, input2]) => [KeywordSymbolMapping(_0), input2]);
  var KeywordVoid = (input) => If2(Const("void", input), ([_0, input2]) => [KeywordVoidMapping(_0), input2]);
  var KeywordThis = (input) => If2(Const("this", input), ([_0, input2]) => [KeywordThisMapping(_0), input2]);
  var TemplateInterpolate = (input) => If2(If2(Const("${", input), ([_0, input2]) => If2(Type(input2), ([_1, input3]) => If2(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [TemplateInterpolateMapping(_0), input2]);
  var TemplateSpan = (input) => If2(Until(["${", "`"], input), ([_0, input2]) => [TemplateSpanMapping(_0), input2]);
  var TemplateBody = (input) => If2(If2(If2(TemplateSpan(input), ([_0, input2]) => If2(TemplateInterpolate(input2), ([_1, input3]) => If2(TemplateBody(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If2(If2(TemplateSpan(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2(If2(TemplateSpan(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [TemplateBodyMapping(_0), input2]);
  var TemplateLiteralTypes = (input) => If2(If2(Const("`", input), ([_0, input2]) => If2(TemplateBody(input2), ([_1, input3]) => If2(Const("`", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [TemplateLiteralTypesMapping(_0), input2]);
  var TemplateLiteral = (input) => If2(TemplateLiteralTypes(input), ([_0, input2]) => [TemplateLiteralMapping(_0), input2]);
  var Dependent2 = (input) => If2(If2(If2(Const("if", input), ([_0, input2]) => If2(Type(input2), ([_1, input3]) => If2(Const("then", input3), ([_2, input4]) => If2(Type(input4), ([_3, input5]) => If2(Const("else", input5), ([_4, input6]) => If2(Type(input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [_0, input2], () => If2(If2(Const("if", input), ([_0, input2]) => If2(Type(input2), ([_1, input3]) => If2(Const("then", input3), ([_2, input4]) => If2(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [DependentMapping(_0), input2]);
  var LiteralBigInt = (input) => If2(BigInt3(input), ([_0, input2]) => [LiteralBigIntMapping(_0), input2]);
  var LiteralBoolean = (input) => If2(If2(Const("true", input), ([_0, input2]) => [_0, input2], () => If2(Const("false", input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [LiteralBooleanMapping(_0), input2]);
  var LiteralNumber = (input) => If2(Number3(input), ([_0, input2]) => [LiteralNumberMapping(_0), input2]);
  var LiteralString = (input) => If2(String3(["'", '"'], input), ([_0, input2]) => [LiteralStringMapping(_0), input2]);
  var KeyOf = (input) => If2(If2(If2(Const("keyof", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [KeyOfMapping(_0), input2]);
  var IndexArray_0 = (input, result = []) => If2(If2(If2(Const("[", input), ([_0, input2]) => If2(Type(input2), ([_1, input3]) => If2(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If2(If2(Const("[", input), ([_0, input2]) => If2(Const("]", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => IndexArray_0(input2, [...result, _0]), () => [result, input]);
  var IndexArray = (input) => If2(IndexArray_0(input), ([_0, input2]) => [IndexArrayMapping(_0), input2]);
  var Extends2 = (input) => If2(If2(If2(Const("extends", input), ([_0, input2]) => If2(Type(input2), ([_1, input3]) => If2(Const("?", input3), ([_2, input4]) => If2(Type(input4), ([_3, input5]) => If2(Const(":", input5), ([_4, input6]) => If2(Type(input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExtendsMapping(_0), input2]);
  var Base = (input) => If2(If2(If2(Const("(", input), ([_0, input2]) => If2(Type(input2), ([_1, input3]) => If2(Const(")", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If2(KeywordString(input), ([_0, input2]) => [_0, input2], () => If2(KeywordNumber(input), ([_0, input2]) => [_0, input2], () => If2(KeywordBoolean(input), ([_0, input2]) => [_0, input2], () => If2(KeywordUndefined(input), ([_0, input2]) => [_0, input2], () => If2(KeywordNull(input), ([_0, input2]) => [_0, input2], () => If2(KeywordInteger(input), ([_0, input2]) => [_0, input2], () => If2(KeywordBigInt(input), ([_0, input2]) => [_0, input2], () => If2(KeywordUnknown(input), ([_0, input2]) => [_0, input2], () => If2(KeywordAny(input), ([_0, input2]) => [_0, input2], () => If2(KeywordObject(input), ([_0, input2]) => [_0, input2], () => If2(KeywordNever(input), ([_0, input2]) => [_0, input2], () => If2(KeywordSymbol(input), ([_0, input2]) => [_0, input2], () => If2(KeywordVoid(input), ([_0, input2]) => [_0, input2], () => If2(KeywordThis(input), ([_0, input2]) => [_0, input2], () => If2(LiteralBigInt(input), ([_0, input2]) => [_0, input2], () => If2(LiteralBoolean(input), ([_0, input2]) => [_0, input2], () => If2(LiteralNumber(input), ([_0, input2]) => [_0, input2], () => If2(LiteralString(input), ([_0, input2]) => [_0, input2], () => If2(TemplateLiteral(input), ([_0, input2]) => [_0, input2], () => If2(Dependent2(input), ([_0, input2]) => [_0, input2], () => If2(_Object_2(input), ([_0, input2]) => [_0, input2], () => If2(_Tuple_(input), ([_0, input2]) => [_0, input2], () => If2(_Constructor_(input), ([_0, input2]) => [_0, input2], () => If2(_Function_2(input), ([_0, input2]) => [_0, input2], () => If2(_Mapped_(input), ([_0, input2]) => [_0, input2], () => If2(GenericCall(input), ([_0, input2]) => [_0, input2], () => If2(Reference(input), ([_0, input2]) => [_0, input2], () => [])))))))))))))))))))))))))))), ([_0, input2]) => [BaseMapping(_0), input2]);
  var With = (input) => If2(If2(If2(Const("with", input), ([_0, input2]) => If2(WithObject(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [WithMapping(_0), input2]);
  var Factor = (input) => If2(If2(KeyOf(input), ([_0, input2]) => If2(Base(input2), ([_1, input3]) => If2(IndexArray(input3), ([_2, input4]) => If2(Extends2(input4), ([_3, input5]) => If2(With(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [FactorMapping(_0), input2]);
  var ExprTermTail = (input) => If2(If2(If2(Const("&", input), ([_0, input2]) => If2(Factor(input2), ([_1, input3]) => If2(ExprTermTail(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExprTermTailMapping(_0), input2]);
  var ExprTerm = (input) => If2(If2(Factor(input), ([_0, input2]) => If2(ExprTermTail(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprTermMapping(_0), input2]);
  var ExprTail = (input) => If2(If2(If2(Const("|", input), ([_0, input2]) => If2(ExprTerm(input2), ([_1, input3]) => If2(ExprTail(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExprTailMapping(_0), input2]);
  var Expr = (input) => If2(If2(ExprTerm(input), ([_0, input2]) => If2(ExprTail(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprMapping(_0), input2]);
  var ExprReadonly = (input) => If2(If2(Const("readonly", input), ([_0, input2]) => If2(Expr(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprReadonlyMapping(_0), input2]);
  var ExprPipe = (input) => If2(If2(Const("|", input), ([_0, input2]) => If2(Expr(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprPipeMapping(_0), input2]);
  var GenericType = (input) => If2(If2(GenericParameters(input), ([_0, input2]) => If2(Const("=", input2), ([_1, input3]) => If2(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericTypeMapping(_0), input2]);
  var InferType = (input) => If2(If2(If2(Const("infer", input), ([_0, input2]) => If2(Ident(input2), ([_1, input3]) => If2(Const("extends", input3), ([_2, input4]) => If2(Expr(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If2(If2(Const("infer", input), ([_0, input2]) => If2(Ident(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [InferTypeMapping(_0), input2]);
  var Type = (input) => If2(If2(InferType(input), ([_0, input2]) => [_0, input2], () => If2(ExprPipe(input), ([_0, input2]) => [_0, input2], () => If2(ExprReadonly(input), ([_0, input2]) => [_0, input2], () => If2(Expr(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [TypeMapping(_0), input2]);
  var PropertyKeyNumber = (input) => If2(Number3(input), ([_0, input2]) => [PropertyKeyNumberMapping(_0), input2]);
  var PropertyKeyIdent = (input) => If2(Ident(input), ([_0, input2]) => [PropertyKeyIdentMapping(_0), input2]);
  var PropertyKeyQuoted = (input) => If2(String3(["'", '"'], input), ([_0, input2]) => [PropertyKeyQuotedMapping(_0), input2]);
  var PropertyKeyIndex = (input) => If2(If2(Const("[", input), ([_0, input2]) => If2(Ident(input2), ([_1, input3]) => If2(Const(":", input3), ([_2, input4]) => If2(If2(KeywordInteger(input4), ([_02, input5]) => [_02, input5], () => If2(KeywordNumber(input4), ([_02, input5]) => [_02, input5], () => If2(KeywordString(input4), ([_02, input5]) => [_02, input5], () => If2(KeywordSymbol(input4), ([_02, input5]) => [_02, input5], () => [])))), ([_3, input5]) => If2(Const("]", input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [PropertyKeyIndexMapping(_0), input2]);
  var PropertyKey = (input) => If2(If2(PropertyKeyNumber(input), ([_0, input2]) => [_0, input2], () => If2(PropertyKeyIdent(input), ([_0, input2]) => [_0, input2], () => If2(PropertyKeyQuoted(input), ([_0, input2]) => [_0, input2], () => If2(PropertyKeyIndex(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [PropertyKeyMapping(_0), input2]);
  var Readonly2 = (input) => If2(If2(If2(Const("readonly", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ReadonlyMapping(_0), input2]);
  var Optional3 = (input) => If2(If2(If2(Const("?", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [OptionalMapping(_0), input2]);
  var Property = (input) => If2(If2(Readonly2(input), ([_0, input2]) => If2(PropertyKey(input2), ([_1, input3]) => If2(Optional3(input3), ([_2, input4]) => If2(Const(":", input4), ([_3, input5]) => If2(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [PropertyMapping(_0), input2]);
  var PropertyDelimiter = (input) => If2(If2(If2(Const(",", input), ([_0, input2]) => If2(Const("\n", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2(If2(Const(";", input), ([_0, input2]) => If2(Const("\n", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2(If2(Const(",", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2(If2(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2(If2(Const("\n", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))))), ([_0, input2]) => [PropertyDelimiterMapping(_0), input2]);
  var PropertyList_0 = (input, result = []) => If2(If2(Property(input), ([_0, input2]) => If2(PropertyDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => PropertyList_0(input2, [...result, _0]), () => [result, input]);
  var PropertyList = (input) => If2(If2(PropertyList_0(input), ([_0, input2]) => If2(If2(If2(Property(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If2([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [PropertyListMapping(_0), input2]);
  var Properties = (input) => If2(If2(Const("{", input), ([_0, input2]) => If2(PropertyList(input2), ([_1, input3]) => If2(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PropertiesMapping(_0), input2]);
  var _Object_2 = (input) => If2(Properties(input), ([_0, input2]) => [_Object_Mapping(_0), input2]);
  var ElementNamed = (input) => If2(If2(If2(Ident(input), ([_0, input2]) => If2(Const("?", input2), ([_1, input3]) => If2(Const(":", input3), ([_2, input4]) => If2(Const("readonly", input4), ([_3, input5]) => If2(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [_0, input2], () => If2(If2(Ident(input), ([_0, input2]) => If2(Const(":", input2), ([_1, input3]) => If2(Const("readonly", input3), ([_2, input4]) => If2(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If2(If2(Ident(input), ([_0, input2]) => If2(Const("?", input2), ([_1, input3]) => If2(Const(":", input3), ([_2, input4]) => If2(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If2(If2(Ident(input), ([_0, input2]) => If2(Const(":", input2), ([_1, input3]) => If2(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [ElementNamedMapping(_0), input2]);
  var ElementReadonlyOptional = (input) => If2(If2(Const("readonly", input), ([_0, input2]) => If2(Type(input2), ([_1, input3]) => If2(Const("?", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ElementReadonlyOptionalMapping(_0), input2]);
  var ElementReadonly = (input) => If2(If2(Const("readonly", input), ([_0, input2]) => If2(Type(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementReadonlyMapping(_0), input2]);
  var ElementOptional = (input) => If2(If2(Type(input), ([_0, input2]) => If2(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementOptionalMapping(_0), input2]);
  var ElementBase = (input) => If2(If2(ElementNamed(input), ([_0, input2]) => [_0, input2], () => If2(ElementReadonlyOptional(input), ([_0, input2]) => [_0, input2], () => If2(ElementReadonly(input), ([_0, input2]) => [_0, input2], () => If2(ElementOptional(input), ([_0, input2]) => [_0, input2], () => If2(Type(input), ([_0, input2]) => [_0, input2], () => []))))), ([_0, input2]) => [ElementBaseMapping(_0), input2]);
  var Element = (input) => If2(If2(If2(Const("...", input), ([_0, input2]) => If2(ElementBase(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2(If2(ElementBase(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ElementMapping(_0), input2]);
  var ElementList_0 = (input, result = []) => If2(If2(Element(input), ([_0, input2]) => If2(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ElementList_0(input2, [...result, _0]), () => [result, input]);
  var ElementList = (input) => If2(If2(ElementList_0(input), ([_0, input2]) => If2(If2(If2(Element(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If2([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementListMapping(_0), input2]);
  var _Tuple_ = (input) => If2(If2(Const("[", input), ([_0, input2]) => If2(ElementList(input2), ([_1, input3]) => If2(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_Tuple_Mapping(_0), input2]);
  var ParameterReadonlyOptional = (input) => If2(If2(Ident(input), ([_0, input2]) => If2(Const("?", input2), ([_1, input3]) => If2(Const(":", input3), ([_2, input4]) => If2(Const("readonly", input4), ([_3, input5]) => If2(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [ParameterReadonlyOptionalMapping(_0), input2]);
  var ParameterReadonly = (input) => If2(If2(Ident(input), ([_0, input2]) => If2(Const(":", input2), ([_1, input3]) => If2(Const("readonly", input3), ([_2, input4]) => If2(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [ParameterReadonlyMapping(_0), input2]);
  var ParameterOptional = (input) => If2(If2(Ident(input), ([_0, input2]) => If2(Const("?", input2), ([_1, input3]) => If2(Const(":", input3), ([_2, input4]) => If2(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [ParameterOptionalMapping(_0), input2]);
  var ParameterType = (input) => If2(If2(Ident(input), ([_0, input2]) => If2(Const(":", input2), ([_1, input3]) => If2(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ParameterTypeMapping(_0), input2]);
  var ParameterBase = (input) => If2(If2(ParameterReadonlyOptional(input), ([_0, input2]) => [_0, input2], () => If2(ParameterReadonly(input), ([_0, input2]) => [_0, input2], () => If2(ParameterOptional(input), ([_0, input2]) => [_0, input2], () => If2(ParameterType(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [ParameterBaseMapping(_0), input2]);
  var Parameter2 = (input) => If2(If2(If2(Const("...", input), ([_0, input2]) => If2(ParameterBase(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2(If2(ParameterBase(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ParameterMapping(_0), input2]);
  var ParameterList_0 = (input, result = []) => If2(If2(Parameter2(input), ([_0, input2]) => If2(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ParameterList_0(input2, [...result, _0]), () => [result, input]);
  var ParameterList = (input) => If2(If2(ParameterList_0(input), ([_0, input2]) => If2(If2(If2(Parameter2(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If2([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ParameterListMapping(_0), input2]);
  var _Function_2 = (input) => If2(If2(Const("(", input), ([_0, input2]) => If2(ParameterList(input2), ([_1, input3]) => If2(Const(")", input3), ([_2, input4]) => If2(Const("=>", input4), ([_3, input5]) => If2(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [_Function_Mapping(_0), input2]);
  var _Constructor_ = (input) => If2(If2(Const("new", input), ([_0, input2]) => If2(Const("(", input2), ([_1, input3]) => If2(ParameterList(input3), ([_2, input4]) => If2(Const(")", input4), ([_3, input5]) => If2(Const("=>", input5), ([_4, input6]) => If2(Type(input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [_Constructor_Mapping(_0), input2]);
  var MappedReadonly = (input) => If2(If2(If2(Const("+", input), ([_0, input2]) => If2(Const("readonly", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2(If2(Const("-", input), ([_0, input2]) => If2(Const("readonly", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2(If2(Const("readonly", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [MappedReadonlyMapping(_0), input2]);
  var MappedOptional = (input) => If2(If2(If2(Const("+", input), ([_0, input2]) => If2(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2(If2(Const("-", input), ([_0, input2]) => If2(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2(If2(Const("?", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [MappedOptionalMapping(_0), input2]);
  var MappedAs = (input) => If2(If2(If2(Const("as", input), ([_0, input2]) => If2(Type(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [MappedAsMapping(_0), input2]);
  var _Mapped_ = (input) => If2(If2(Const("{", input), ([_0, input2]) => If2(MappedReadonly(input2), ([_1, input3]) => If2(Const("[", input3), ([_2, input4]) => If2(Ident(input4), ([_3, input5]) => If2(Const("in", input5), ([_4, input6]) => If2(Type(input6), ([_5, input7]) => If2(MappedAs(input7), ([_6, input8]) => If2(Const("]", input8), ([_7, input9]) => If2(MappedOptional(input9), ([_8, input10]) => If2(Const(":", input10), ([_9, input11]) => If2(Type(input11), ([_10, input12]) => If2(OptionalSemiColon(input12), ([_11, input13]) => If2(Const("}", input13), ([_12, input14]) => [[_0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12], input14]))))))))))))), ([_0, input2]) => [_Mapped_Mapping(_0), input2]);
  var Reference = (input) => If2(Ident(input), ([_0, input2]) => [ReferenceMapping(_0), input2]);
  var WithBigInt = (input) => If2(BigInt3(input), ([_0, input2]) => [WithBigIntMapping(_0), input2]);
  var WithNumber = (input) => If2(Number3(input), ([_0, input2]) => [WithNumberMapping(_0), input2]);
  var WithBoolean = (input) => If2(If2(Const("true", input), ([_0, input2]) => [_0, input2], () => If2(Const("false", input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [WithBooleanMapping(_0), input2]);
  var WithString = (input) => If2(String3(['"', "'"], input), ([_0, input2]) => [WithStringMapping(_0), input2]);
  var WithNull = (input) => If2(Const("null", input), ([_0, input2]) => [WithNullMapping(_0), input2]);
  var WithUndefined = (input) => If2(Const("undefined", input), ([_0, input2]) => [WithUndefinedMapping(_0), input2]);
  var WithProperty = (input) => If2(If2(PropertyKey(input), ([_0, input2]) => If2(Const(":", input2), ([_1, input3]) => If2(WithValue(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [WithPropertyMapping(_0), input2]);
  var WithPropertyList_0 = (input, result = []) => If2(If2(WithProperty(input), ([_0, input2]) => If2(PropertyDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => WithPropertyList_0(input2, [...result, _0]), () => [result, input]);
  var WithPropertyList = (input) => If2(If2(WithPropertyList_0(input), ([_0, input2]) => If2(If2(If2(WithProperty(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If2([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [WithPropertyListMapping(_0), input2]);
  var WithObject = (input) => If2(If2(Const("{", input), ([_0, input2]) => If2(WithPropertyList(input2), ([_1, input3]) => If2(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [WithObjectMapping(_0), input2]);
  var WithElementList_0 = (input, result = []) => If2(If2(WithValue(input), ([_0, input2]) => If2(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => WithElementList_0(input2, [...result, _0]), () => [result, input]);
  var WithElementList = (input) => If2(If2(WithElementList_0(input), ([_0, input2]) => If2(If2(If2(WithValue(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If2([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [WithElementListMapping(_0), input2]);
  var WithArray = (input) => If2(If2(Const("[", input), ([_0, input2]) => If2(WithElementList(input2), ([_1, input3]) => If2(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [WithArrayMapping(_0), input2]);
  var WithValue = (input) => If2(If2(WithBigInt(input), ([_0, input2]) => [_0, input2], () => If2(WithNumber(input), ([_0, input2]) => [_0, input2], () => If2(WithBoolean(input), ([_0, input2]) => [_0, input2], () => If2(WithString(input), ([_0, input2]) => [_0, input2], () => If2(WithNull(input), ([_0, input2]) => [_0, input2], () => If2(WithUndefined(input), ([_0, input2]) => [_0, input2], () => If2(WithObject(input), ([_0, input2]) => [_0, input2], () => If2(WithArray(input), ([_0, input2]) => [_0, input2], () => [])))))))), ([_0, input2]) => [WithValueMapping(_0), input2]);
  var PatternBigInt = (input) => If2(Const("-?(?:0|[1-9][0-9]*)n", input), ([_0, input2]) => [PatternBigIntMapping(_0), input2]);
  var PatternString = (input) => If2(Const(".*", input), ([_0, input2]) => [PatternStringMapping(_0), input2]);
  var PatternNumber = (input) => If2(Const("-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?", input), ([_0, input2]) => [PatternNumberMapping(_0), input2]);
  var PatternInteger = (input) => If2(Const("-?(?:0|[1-9][0-9]*)", input), ([_0, input2]) => [PatternIntegerMapping(_0), input2]);
  var PatternNever = (input) => If2(Const("(?!)", input), ([_0, input2]) => [PatternNeverMapping(_0), input2]);
  var PatternText = (input) => If2(Until_1(["-?(?:0|[1-9][0-9]*)n", ".*", "-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?", "-?(?:0|[1-9][0-9]*)", "(?!)", "(", ")", "$", "|"], input), ([_0, input2]) => [PatternTextMapping(_0), input2]);
  var PatternBase = (input) => If2(If2(PatternBigInt(input), ([_0, input2]) => [_0, input2], () => If2(PatternString(input), ([_0, input2]) => [_0, input2], () => If2(PatternNumber(input), ([_0, input2]) => [_0, input2], () => If2(PatternInteger(input), ([_0, input2]) => [_0, input2], () => If2(PatternNever(input), ([_0, input2]) => [_0, input2], () => If2(PatternGroup(input), ([_0, input2]) => [_0, input2], () => If2(PatternText(input), ([_0, input2]) => [_0, input2], () => []))))))), ([_0, input2]) => [PatternBaseMapping(_0), input2]);
  var PatternGroup = (input) => If2(If2(Const("(", input), ([_0, input2]) => If2(PatternBody(input2), ([_1, input3]) => If2(Const(")", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PatternGroupMapping(_0), input2]);
  var PatternUnion = (input) => If2(If2(If2(PatternTerm(input), ([_0, input2]) => If2(Const("|", input2), ([_1, input3]) => If2(PatternUnion(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If2(If2(PatternTerm(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [PatternUnionMapping(_0), input2]);
  var PatternTerm = (input) => If2(If2(PatternBase(input), ([_0, input2]) => If2(PatternBody(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [PatternTermMapping(_0), input2]);
  var PatternBody = (input) => If2(If2(PatternUnion(input), ([_0, input2]) => [_0, input2], () => If2(PatternTerm(input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [PatternBodyMapping(_0), input2]);
  var Pattern = (input) => If2(If2(Const("^", input), ([_0, input2]) => If2(PatternBody(input2), ([_1, input3]) => If2(Const("$", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PatternMapping(_0), input2]);
  var InterfaceDeclarationHeritageList_0 = (input, result = []) => If2(If2(Type(input), ([_0, input2]) => If2(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => InterfaceDeclarationHeritageList_0(input2, [...result, _0]), () => [result, input]);
  var InterfaceDeclarationHeritageList = (input) => If2(If2(InterfaceDeclarationHeritageList_0(input), ([_0, input2]) => If2(If2(If2(Type(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If2([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [InterfaceDeclarationHeritageListMapping(_0), input2]);
  var InterfaceDeclarationHeritage = (input) => If2(If2(If2(Const("extends", input), ([_0, input2]) => If2(InterfaceDeclarationHeritageList(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [InterfaceDeclarationHeritageMapping(_0), input2]);
  var InterfaceDeclarationGeneric = (input) => If2(If2(Const("interface", input), ([_0, input2]) => If2(Ident(input2), ([_1, input3]) => If2(GenericParameters(input3), ([_2, input4]) => If2(InterfaceDeclarationHeritage(input4), ([_3, input5]) => If2(Properties(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [InterfaceDeclarationGenericMapping(_0), input2]);
  var InterfaceDeclaration = (input) => If2(If2(Const("interface", input), ([_0, input2]) => If2(Ident(input2), ([_1, input3]) => If2(InterfaceDeclarationHeritage(input3), ([_2, input4]) => If2(Properties(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [InterfaceDeclarationMapping(_0), input2]);
  var TypeAliasDeclarationGeneric = (input) => If2(If2(Const("type", input), ([_0, input2]) => If2(Ident(input2), ([_1, input3]) => If2(GenericParameters(input3), ([_2, input4]) => If2(Const("=", input4), ([_3, input5]) => If2(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [TypeAliasDeclarationGenericMapping(_0), input2]);
  var TypeAliasDeclaration = (input) => If2(If2(Const("type", input), ([_0, input2]) => If2(Ident(input2), ([_1, input3]) => If2(Const("=", input3), ([_2, input4]) => If2(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [TypeAliasDeclarationMapping(_0), input2]);
  var ExportKeyword = (input) => If2(If2(If2(Const("export", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExportKeywordMapping(_0), input2]);
  var ModuleDeclarationDelimiter = (input) => If2(If2(If2(Const(";", input), ([_0, input2]) => If2(Const("\n", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If2(If2(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If2(If2(Const("\n", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [ModuleDeclarationDelimiterMapping(_0), input2]);
  var ModuleDeclarationList_0 = (input, result = []) => If2(If2(ModuleDeclaration(input), ([_0, input2]) => If2(ModuleDeclarationDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ModuleDeclarationList_0(input2, [...result, _0]), () => [result, input]);
  var ModuleDeclarationList = (input) => If2(If2(ModuleDeclarationList_0(input), ([_0, input2]) => If2(If2(If2(ModuleDeclaration(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If2([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ModuleDeclarationListMapping(_0), input2]);
  var ModuleDeclaration = (input) => If2(If2(ExportKeyword(input), ([_0, input2]) => If2(If2(InterfaceDeclarationGeneric(input2), ([_02, input3]) => [_02, input3], () => If2(InterfaceDeclaration(input2), ([_02, input3]) => [_02, input3], () => If2(TypeAliasDeclarationGeneric(input2), ([_02, input3]) => [_02, input3], () => If2(TypeAliasDeclaration(input2), ([_02, input3]) => [_02, input3], () => [])))), ([_1, input3]) => If2(OptionalSemiColon(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ModuleDeclarationMapping(_0), input2]);
  var Module = (input) => If2(If2(ModuleDeclaration(input), ([_0, input2]) => If2(ModuleDeclarationList(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ModuleMapping(_0), input2]);
  var Script = (input) => If2(If2(Module(input), ([_0, input2]) => [_0, input2], () => If2(GenericType(input), ([_0, input2]) => [_0, input2], () => If2(Type(input), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [ScriptMapping(_0), input2]);

  // runtime/node_modules/typebox/build/type/engine/patterns/template.mjs
  function ParseTemplateIntoTypes(template) {
    const parsed = TemplateLiteralTypes(`\`${template}\``);
    const result = guard_exports.IsEqual(parsed.length, 2) ? parsed[0] : Unreachable();
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/template_literal/encode.mjs
  function JoinString(input) {
    return input.join("|");
  }
  function UnwrapTemplateLiteralPattern(pattern) {
    return pattern.slice(1, pattern.length - 1);
  }
  function EncodeLiteral(value, right, pattern) {
    return EncodeTypes(right, `${pattern}${value}`);
  }
  function EncodeBigInt(right, pattern) {
    return EncodeTypes(right, `${pattern}${BigIntPattern}`);
  }
  function EncodeInteger(right, pattern) {
    return EncodeTypes(right, `${pattern}${IntegerPattern}`);
  }
  function EncodeNumber(right, pattern) {
    return EncodeTypes(right, `${pattern}${NumberPattern}`);
  }
  function EncodeBoolean(right, pattern) {
    return EncodeType(Union([Literal("false"), Literal("true")]), right, pattern);
  }
  function EncodeString(right, pattern) {
    return EncodeTypes(right, `${pattern}${StringPattern}`);
  }
  function EncodeTemplateLiteral(templatePattern, right, pattern) {
    return EncodeTypes(right, `${pattern}${UnwrapTemplateLiteralPattern(templatePattern)}`);
  }
  function EncodeTemplateLiteralDeferred(types, right, pattern) {
    const templateLiteral = TemplateLiteralAction(types, {});
    const result = EncodeType(templateLiteral, right, pattern);
    return result;
  }
  function EncodeEnum(values, right, pattern) {
    const evaluated = EvaluateEnum(values);
    return EncodeType(evaluated, right, pattern);
  }
  function EncodeUnion(types, right, pattern, result = []) {
    return guard_exports.ShiftLeft(types, (head, tail) => EncodeUnion(tail, right, pattern, [...result, EncodeType(head, [], "")]), () => EncodeTypes(right, `${pattern}(${JoinString(result)})`));
  }
  function EncodeType(type, right, pattern) {
    return IsEnum(type) ? EncodeEnum(type.enum, right, pattern) : IsInteger3(type) ? EncodeInteger(right, pattern) : IsLiteral(type) ? EncodeLiteral(type.const, right, pattern) : IsBigInt3(type) ? EncodeBigInt(right, pattern) : IsBoolean4(type) ? EncodeBoolean(right, pattern) : IsNumber4(type) ? EncodeNumber(right, pattern) : IsString4(type) ? EncodeString(right, pattern) : IsTemplateLiteral(type) ? EncodeTemplateLiteral(type.pattern, right, pattern) : IsTemplateLiteralDeferred(type) ? EncodeTemplateLiteralDeferred(type.parameters[0], right, pattern) : IsUnion(type) ? EncodeUnion(type.anyOf, right, pattern) : NeverPattern;
  }
  function EncodeTypes(types, pattern) {
    return guard_exports.ShiftLeft(types, (left, right) => EncodeType(left, right, pattern), () => pattern);
  }
  function EncodePattern(types) {
    const encoded = EncodeTypes(types, "");
    const result = `^${encoded}$`;
    return result;
  }
  function TemplateLiteralEncode(types) {
    const pattern = EncodePattern(types);
    const result = TemplateLiteralCreate(pattern);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/template_literal/instantiate.mjs
  function TemplateLiteralAction(types, options) {
    const result = CanInstantiate(types) ? memory_exports.Update(TemplateLiteralEncode(types), {}, options) : TemplateLiteralDeferred(types, options);
    return result;
  }
  function TemplateLiteralInstantiate(context, state2, types, options) {
    const instantiatedTypes = InstantiateTypes(context, state2, types);
    return TemplateLiteralAction(instantiatedTypes, options);
  }

  // runtime/node_modules/typebox/build/type/types/template_literal.mjs
  function TemplateLiteralDeferred(types, options = {}) {
    return Deferred("TemplateLiteral", [types], options);
  }
  function IsTemplateLiteralDeferred(value) {
    return IsSchema(value) && guard_exports.HasPropertyKey(value, "action") && guard_exports.IsEqual(value.action, "TemplateLiteral");
  }
  function TemplateLiteralFromTypes(types) {
    return TemplateLiteralAction(types, {});
  }
  function TemplateLiteralFromString(template) {
    const types = ParseTemplateIntoTypes(template);
    return TemplateLiteralFromTypes(types);
  }
  function TemplateLiteral2(input, options = {}) {
    const type = guard_exports.IsString(input) ? TemplateLiteralFromString(input) : TemplateLiteralFromTypes(input);
    return memory_exports.Update(type, {}, options);
  }
  function IsTemplateLiteral(value) {
    return IsKind(value, "TemplateLiteral");
  }

  // runtime/node_modules/typebox/build/type/extends/result.mjs
  var result_exports = {};
  __export(result_exports, {
    ExtendsFalse: () => ExtendsFalse,
    ExtendsTrue: () => ExtendsTrue,
    ExtendsUnion: () => ExtendsUnion,
    IsExtendsFalse: () => IsExtendsFalse,
    IsExtendsTrue: () => IsExtendsTrue,
    IsExtendsTrueLike: () => IsExtendsTrueLike,
    IsExtendsUnion: () => IsExtendsUnion,
    Match: () => Match3
  });
  function ExtendsUnion(inferred) {
    return memory_exports.Create({ ["~kind"]: "ExtendsUnion" }, { inferred });
  }
  function IsExtendsUnion(value) {
    return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "inferred") && guard_exports.IsEqual(value["~kind"], "ExtendsUnion") && guard_exports.IsObject(value.inferred);
  }
  function ExtendsTrue(inferred) {
    return memory_exports.Create({ ["~kind"]: "ExtendsTrue" }, { inferred });
  }
  function IsExtendsTrue(value) {
    return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "inferred") && guard_exports.IsEqual(value["~kind"], "ExtendsTrue") && guard_exports.IsObject(value.inferred);
  }
  function ExtendsFalse() {
    return memory_exports.Create({ ["~kind"]: "ExtendsFalse" }, {});
  }
  function IsExtendsFalse(value) {
    return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.IsEqual(value["~kind"], "ExtendsFalse");
  }
  function IsExtendsTrueLike(value) {
    return IsExtendsUnion(value) || IsExtendsTrue(value);
  }
  function Match3(result, true_, false_) {
    return IsExtendsTrueLike(result) ? true_(result.inferred) : false_();
  }

  // runtime/node_modules/typebox/build/type/extends/extends_right.mjs
  function ExtendsRightInfer(inferred, name, left, right) {
    return Match3(ExtendsLeft(inferred, left, right), (checkInferred) => ExtendsTrue(memory_exports.Assign(memory_exports.Assign(inferred, checkInferred), { [name]: left })), () => ExtendsFalse());
  }
  function ExtendsRightAny(inferred, _left) {
    return ExtendsTrue(inferred);
  }
  function ExtendsRightDependent(inferred, left, if_, then_, else_) {
    return Match3(ExtendsLeft(inferred, left, if_), (inferred2) => Match3(ExtendsLeft(inferred2, left, then_), (inferred3) => ExtendsTrue(inferred3), () => ExtendsFalse()), () => Match3(ExtendsLeft(inferred, left, else_), (inferred2) => ExtendsTrue(inferred2), () => ExtendsFalse()));
  }
  function ExtendsRightEnum(inferred, left, right) {
    const evaluated = EvaluateEnum(right);
    return ExtendsLeft(inferred, left, evaluated);
  }
  function ExtendsRightIntersect(inferred, left, right) {
    return guard_exports.ShiftLeft(right, (head, tail) => Match3(ExtendsLeft(inferred, left, head), (inferred2) => ExtendsRightIntersect(inferred2, left, tail), () => ExtendsFalse()), () => ExtendsTrue(inferred));
  }
  function ExtendsRightTemplateLiteral(inferred, left, right) {
    const evaluated = EvaluateTemplateLiteral(right);
    return ExtendsLeft(inferred, left, evaluated);
  }
  function ExtendsRightUnion(inferred, left, right) {
    return guard_exports.ShiftLeft(right, (head, tail) => Match3(ExtendsLeft(inferred, left, head), (inferred2) => ExtendsTrue(inferred2), () => ExtendsRightUnion(inferred, left, tail)), () => ExtendsFalse());
  }
  function ExtendsRight(inferred, left, right) {
    return IsAny(right) ? ExtendsRightAny(inferred, left) : IsDependent(right) ? ExtendsRightDependent(inferred, left, right.if, right.then, right.else) : IsEnum(right) ? ExtendsRightEnum(inferred, left, right.enum) : IsInfer(right) ? ExtendsRightInfer(inferred, right.name, left, right.extends) : IsIntersect(right) ? ExtendsRightIntersect(inferred, left, right.allOf) : IsTemplateLiteral(right) ? ExtendsRightTemplateLiteral(inferred, left, right.pattern) : IsUnion(right) ? ExtendsRightUnion(inferred, left, right.anyOf) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsFalse();
  }

  // runtime/node_modules/typebox/build/type/extends/any.mjs
  function ExtendsAny(inferred, left, right) {
    return IsInfer(right) ? ExtendsRight(inferred, left, right) : IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsUnion(inferred);
  }

  // runtime/node_modules/typebox/build/type/extends/array.mjs
  function ExtendsImmutable(left, right) {
    const isImmutableLeft = IsImmutable(left);
    const isImmutableRight = IsImmutable(right);
    return isImmutableLeft && isImmutableRight ? true : !isImmutableLeft && isImmutableRight ? true : isImmutableLeft && !isImmutableRight ? false : true;
  }
  function ExtendsArray(inferred, arrayLeft, left, right) {
    return IsArray3(right) ? ExtendsImmutable(arrayLeft, right) ? ExtendsLeft(inferred, left, right.items) : ExtendsFalse() : ExtendsRight(inferred, arrayLeft, right);
  }

  // runtime/node_modules/typebox/build/type/extends/bigint.mjs
  function ExtendsBigInt(inferred, left, right) {
    return IsBigInt3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/boolean.mjs
  function ExtendsBoolean(inferred, left, right) {
    return IsBoolean4(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/parameters.mjs
  function ParameterCompare(inferred, left, leftRest, right, rightRest) {
    const checkLeft = IsInfer(right) ? left : right;
    const checkRight = IsInfer(right) ? right : left;
    const isLeftOptional = IsOptional(left);
    const isRightOptional = IsOptional(right);
    return !isLeftOptional && isRightOptional ? ExtendsFalse() : Match3(ExtendsLeft(inferred, checkLeft, checkRight), (inferred2) => ExtendsParameters(inferred2, leftRest, rightRest), () => ExtendsFalse());
  }
  function ParameterRight(inferred, left, leftRest, rightRest) {
    return guard_exports.ShiftLeft(rightRest, (head, tail) => ParameterCompare(inferred, left, leftRest, head, tail), () => IsOptional(left) ? ExtendsTrue(inferred) : ExtendsFalse());
  }
  function ParametersLeft(inferred, left, rightRest) {
    return guard_exports.ShiftLeft(left, (head, tail) => ParameterRight(inferred, head, tail, rightRest), () => ExtendsTrue(inferred));
  }
  function ExtendsParameters(inferred, left, right) {
    return ParametersLeft(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/return_type.mjs
  function ExtendsReturnType(inferred, left, right) {
    return IsVoid(right) ? ExtendsTrue(inferred) : ExtendsLeft(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/constructor.mjs
  function ExtendsConstructor(inferred, parameters, returnType, right) {
    return IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : IsConstructor3(right) ? Match3(ExtendsParameters(inferred, parameters, right["parameters"]), (inferred2) => ExtendsReturnType(inferred2, returnType, right["instanceType"]), () => ExtendsFalse()) : ExtendsFalse();
  }

  // runtime/node_modules/typebox/build/type/extends/dependent.mjs
  function ExtendsDependent(inferred, if_, then_, else_, right) {
    return Match3(ExtendsLeft(inferred, if_, right), () => ExtendsLeft(inferred, then_, right), () => ExtendsLeft(inferred, else_, right));
  }

  // runtime/node_modules/typebox/build/type/extends/enum.mjs
  function ExtendsEnum(inferred, left, right) {
    const evaluated = EvaluateEnum(left);
    return ExtendsLeft(inferred, evaluated, right);
  }

  // runtime/node_modules/typebox/build/type/extends/function.mjs
  function ExtendsFunction(inferred, parameters, returnType, right) {
    return IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : IsFunction3(right) ? Match3(ExtendsParameters(inferred, parameters, right["parameters"]), (inferred2) => ExtendsReturnType(inferred2, returnType, right["returnType"]), () => ExtendsFalse()) : ExtendsFalse();
  }

  // runtime/node_modules/typebox/build/type/extends/integer.mjs
  function ExtendsInteger(inferred, left, right) {
    return IsInteger3(right) ? ExtendsTrue(inferred) : IsNumber4(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/intersect.mjs
  function ExtendsIntersect(inferred, left, right) {
    const evaluated = EvaluateIntersect(left);
    return ExtendsLeft(inferred, evaluated, right);
  }

  // runtime/node_modules/typebox/build/type/extends/literal.mjs
  function ExtendsLiteralValue(inferred, left, right) {
    return left === right ? ExtendsTrue(inferred) : ExtendsFalse();
  }
  function ExtendsLiteralBigInt(inferred, left, right) {
    return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsBigInt3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
  }
  function ExtendsLiteralBoolean(inferred, left, right) {
    return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsBoolean4(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
  }
  function ExtendsLiteralNumber(inferred, left, right) {
    return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsNumber4(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
  }
  function ExtendsLiteralString(inferred, left, right) {
    return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsString4(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
  }
  function ExtendsLiteral(inferred, left, right) {
    return guard_exports.IsBigInt(left.const) ? ExtendsLiteralBigInt(inferred, left.const, right) : guard_exports.IsBoolean(left.const) ? ExtendsLiteralBoolean(inferred, left.const, right) : guard_exports.IsNumber(left.const) ? ExtendsLiteralNumber(inferred, left.const, right) : guard_exports.IsString(left.const) ? ExtendsLiteralString(inferred, left.const, right) : Unreachable();
  }

  // runtime/node_modules/typebox/build/type/extends/never.mjs
  function ExtendsNever(inferred, left, right) {
    return IsInfer(right) ? ExtendsRight(inferred, left, right) : ExtendsTrue(inferred);
  }

  // runtime/node_modules/typebox/build/type/extends/null.mjs
  function ExtendsNull(inferred, left, right) {
    return IsNull3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/number.mjs
  function ExtendsNumber(inferred, left, right) {
    return IsNumber4(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/object.mjs
  function ExtendsPropertyOptional(inferred, left, right) {
    return IsOptional(left) ? IsOptional(right) ? ExtendsTrue(inferred) : ExtendsFalse() : ExtendsTrue(inferred);
  }
  function ExtendsProperty(inferred, left, right) {
    return (
      // Right TInfer<TNever> is TExtendsFalse
      IsInfer(right) && IsNever(right.extends) ? ExtendsFalse() : Match3(ExtendsLeft(inferred, left, right), (inferred2) => ExtendsPropertyOptional(inferred2, left, right), () => ExtendsFalse())
    );
  }
  function ExtractInferredProperties(keys, properties) {
    return keys.reduce((result, key) => {
      return key in properties ? IsExtendsTrueLike(properties[key]) ? { ...result, ...properties[key].inferred } : Unreachable() : Unreachable();
    }, {});
  }
  function ExtendsPropertiesComparer(inferred, left, right) {
    const properties = {};
    for (const rightKey of guard_exports.Keys(right)) {
      properties[rightKey] = rightKey in left ? ExtendsProperty({}, left[rightKey], right[rightKey]) : IsOptional(right[rightKey]) ? IsInfer(right[rightKey]) ? ExtendsTrue(memory_exports.Assign(inferred, { [right[rightKey].name]: right[rightKey].extends })) : ExtendsTrue(inferred) : ExtendsFalse();
    }
    const checked = guard_exports.Values(properties).every((result) => IsExtendsTrueLike(result));
    const extracted = checked ? ExtractInferredProperties(guard_exports.Keys(properties), properties) : {};
    return checked ? ExtendsTrue(extracted) : ExtendsFalse();
  }
  function ExtendsProperties(inferred, left, right) {
    const compared = ExtendsPropertiesComparer(inferred, left, right);
    return IsExtendsTrueLike(compared) ? ExtendsTrue(memory_exports.Assign(inferred, compared.inferred)) : ExtendsFalse();
  }
  function ExtendsObjectToObject(inferred, left, right) {
    return ExtendsProperties(inferred, left, right);
  }
  function RecordMergeInferred(left, right) {
    return guard_exports.Keys(right).reduce((result, key) => {
      return {
        ...result,
        [key]: guard_exports.HasPropertyKey(left, key) ? IsUnion(result[key]) ? Union([...result[key].anyOf, right[key]]) : Union([left[key], right[key]]) : right[key]
      };
    }, left);
  }
  function ExtendsRecordComparer(properties, keys, type, result) {
    return guard_exports.ShiftLeft(keys, (left, right) => Match3(ExtendsLeft({}, properties[left], type), (inferred) => ExtendsRecordComparer(properties, right, type, RecordMergeInferred(result, inferred)), () => ExtendsFalse()), () => ExtendsTrue(result));
  }
  function ExtendsObjectToRecord(inferred, properties, _pattern, value) {
    const keys = guard_exports.Keys(properties);
    const result = ExtendsRecordComparer(properties, keys, value, inferred);
    return result;
  }
  function ExtendsObject(inferred, left, right) {
    return IsRecord(right) ? ExtendsObjectToRecord(inferred, left, RecordPattern(right), RecordValue(right)) : IsObject3(right) ? ExtendsObjectToObject(inferred, left, right.properties) : ExtendsRight(inferred, _Object_(left), right);
  }

  // runtime/node_modules/typebox/build/type/extends/record.mjs
  function FromObject3(inferred, properties) {
    return guard_exports.IsEqual(guard_exports.Keys(properties).length, 0) ? ExtendsTrue(inferred) : ExtendsFalse();
  }
  function FromRecord(inferred, _leftKey, leftValue, _rightKey, rightValue) {
    return ExtendsLeft(inferred, leftValue, rightValue);
  }
  function ExtendsRecord(inferred, leftPattern, leftValue, right) {
    return IsRecord(right) ? FromRecord(inferred, RecordPatternToType(leftPattern), leftValue, RecordPatternToType(RecordPattern(right)), RecordValue(right)) : IsObject3(right) ? FromObject3(inferred, right.properties) : IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsFalse();
  }

  // runtime/node_modules/typebox/build/type/extends/string.mjs
  function ExtendsString(inferred, left, right) {
    return IsString4(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/symbol.mjs
  function ExtendsSymbol(inferred, left, right) {
    return IsSymbol3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/template_literal.mjs
  function ExtendsTemplateLiteral(inferred, left, right) {
    const evaluated = EvaluateTemplateLiteral(left);
    return ExtendsLeft(inferred, evaluated, right);
  }

  // runtime/node_modules/typebox/build/type/extends/inference.mjs
  function Inferrable(name, type) {
    return memory_exports.Create({ "~kind": "Inferrable" }, { name, type }, {});
  }
  function IsInferable(value) {
    return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "name") && guard_exports.HasPropertyKey(value, "type") && guard_exports.IsEqual(value["~kind"], "Inferrable") && guard_exports.IsString(value.name) && guard_exports.IsObject(value.type);
  }
  function TryRestInferable(type) {
    return IsRest(type) ? IsInfer(type.items) ? IsArray3(type.items.extends) ? Inferrable(type.items.name, type.items.extends.items) : IsUnknown(type.items.extends) ? Inferrable(type.items.name, type.items.extends) : void 0 : Unreachable() : void 0;
  }
  function TryInferable(type) {
    return IsInfer(type) ? Inferrable(type.name, type.extends) : void 0;
  }
  function TryInferResults(rest, right, result = []) {
    return guard_exports.ShiftLeft(rest, (head, tail) => Match3(ExtendsLeft({}, head, right), () => TryInferResults(tail, right, [...result, head]), () => void 0), () => result);
  }
  function InferTupleResult(inferred, name, left, right) {
    const results = TryInferResults(left, right);
    return guard_exports.IsArray(results) ? ExtendsTrue(memory_exports.Assign(inferred, { [name]: Tuple(results) })) : ExtendsFalse();
  }
  function InferUnionResult(inferred, name, left, right) {
    const results = TryInferResults(left, right);
    return guard_exports.IsArray(results) ? ExtendsTrue(memory_exports.Assign(inferred, { [name]: Union(results) })) : ExtendsFalse();
  }

  // runtime/node_modules/typebox/build/type/extends/tuple.mjs
  function Reverse(types) {
    return [...types].reverse();
  }
  function ApplyReverse(types, reversed) {
    return reversed ? Reverse(types) : types;
  }
  function Reversed(types) {
    const first = types.length > 0 ? types[0] : void 0;
    const inferrable = IsSchema(first) ? TryRestInferable(first) : void 0;
    return IsSchema(inferrable);
  }
  function ElementsCompare(inferred, reversed, left, leftRest, right, rightRest) {
    return Match3(ExtendsLeft(inferred, left, right), (checkInferred) => Elements(checkInferred, reversed, leftRest, rightRest), () => ExtendsFalse());
  }
  function ElementsLeft(inferred, reversed, leftRest, right, rightRest) {
    const inferable = TryRestInferable(right);
    return (
      // Rest Inferrable Right Means we delegate to TInferTupleResult to Generate a Result
      IsInferable(inferable) ? InferTupleResult(inferred, inferable["name"], ApplyReverse(leftRest, reversed), inferable["type"]) : guard_exports.ShiftLeft(leftRest, (head, tail) => ElementsCompare(inferred, reversed, head, tail, right, rightRest), () => ExtendsFalse())
    );
  }
  function ElementsRight(inferred, reversed, leftRest, rightRest) {
    return guard_exports.ShiftLeft(rightRest, (head, tail) => ElementsLeft(inferred, reversed, leftRest, head, tail), () => guard_exports.IsEqual(leftRest.length, 0) ? ExtendsTrue(inferred) : ExtendsFalse());
  }
  function Elements(inferred, reversed, leftRest, rightRest) {
    return ElementsRight(inferred, reversed, leftRest, rightRest);
  }
  function ExtendsTupleToTuple(inferred, left, right) {
    const instantiatedRight = InstantiateElements(inferred, State([], []), right);
    const reversed = Reversed(instantiatedRight);
    return Elements(inferred, reversed, ApplyReverse(left, reversed), ApplyReverse(instantiatedRight, reversed));
  }
  function ExtendsTupleToArray(inferred, left, right) {
    const inferrable = TryInferable(right);
    return IsInferable(inferrable) ? InferUnionResult(inferred, inferrable["name"], left, inferrable["type"]) : guard_exports.ShiftLeft(left, (head, tail) => Match3(ExtendsLeft(inferred, head, right), (inferred2) => ExtendsTupleToArray(inferred2, tail, right), () => ExtendsFalse()), () => ExtendsTrue(inferred));
  }
  function ExtendsTuple(inferred, left, right) {
    const instantiatedLeft = InstantiateElements(inferred, State([], []), left);
    return IsTuple(right) ? ExtendsTupleToTuple(inferred, instantiatedLeft, right.items) : IsArray3(right) ? ExtendsTupleToArray(inferred, instantiatedLeft, right.items) : ExtendsRight(inferred, Tuple(instantiatedLeft), right);
  }

  // runtime/node_modules/typebox/build/type/extends/undefined.mjs
  function ExtendsUndefined(inferred, left, right) {
    return IsVoid(right) ? ExtendsTrue(inferred) : IsUndefined3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/union.mjs
  function ExtendsUnionSome(inferred, type, unionTypes) {
    return guard_exports.ShiftLeft(unionTypes, (head, tail) => Match3(ExtendsLeft(inferred, type, head), (inferred2) => ExtendsTrue(inferred2), () => ExtendsUnionSome(inferred, type, tail)), () => ExtendsFalse());
  }
  function ExtendsUnionLeft(inferred, left, right) {
    return guard_exports.ShiftLeft(left, (head, tail) => Match3(ExtendsUnionSome(inferred, head, right), (inferred2) => ExtendsUnionLeft(inferred2, tail, right), () => ExtendsFalse()), () => ExtendsTrue(inferred));
  }
  function ExtendsUnion2(inferred, left, right) {
    const inferrable = TryInferable(right);
    return IsInferable(inferrable) ? InferUnionResult(inferred, inferrable.name, left, inferrable.type) : IsUnion(right) ? ExtendsUnionLeft(inferred, left, right.anyOf) : ExtendsUnionLeft(inferred, left, [right]);
  }

  // runtime/node_modules/typebox/build/type/extends/unknown.mjs
  function ExtendsUnknown(inferred, left, right) {
    return IsInfer(right) ? ExtendsRight(inferred, left, right) : IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsFalse();
  }

  // runtime/node_modules/typebox/build/type/extends/void.mjs
  function ExtendsVoid(inferred, left, right) {
    return IsVoid(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
  }

  // runtime/node_modules/typebox/build/type/extends/extends_left.mjs
  function ExtendsLeft(inferred, left, right) {
    return IsAny(left) ? ExtendsAny(inferred, left, right) : IsArray3(left) ? ExtendsArray(inferred, left, left.items, right) : IsBigInt3(left) ? ExtendsBigInt(inferred, left, right) : IsBoolean4(left) ? ExtendsBoolean(inferred, left, right) : IsConstructor3(left) ? ExtendsConstructor(inferred, left.parameters, left.instanceType, right) : IsDependent(left) ? ExtendsDependent(inferred, left.if, left.then, left.else, right) : IsEnum(left) ? ExtendsEnum(inferred, left.enum, right) : IsFunction3(left) ? ExtendsFunction(inferred, left.parameters, left.returnType, right) : IsInteger3(left) ? ExtendsInteger(inferred, left, right) : IsIntersect(left) ? ExtendsIntersect(inferred, left.allOf, right) : IsLiteral(left) ? ExtendsLiteral(inferred, left, right) : IsNever(left) ? ExtendsNever(inferred, left, right) : IsNull3(left) ? ExtendsNull(inferred, left, right) : IsNumber4(left) ? ExtendsNumber(inferred, left, right) : IsObject3(left) ? ExtendsObject(inferred, left.properties, right) : IsRecord(left) ? ExtendsRecord(inferred, RecordPattern(left), RecordValue(left), right) : IsString4(left) ? ExtendsString(inferred, left, right) : IsSymbol3(left) ? ExtendsSymbol(inferred, left, right) : IsTemplateLiteral(left) ? ExtendsTemplateLiteral(inferred, left.pattern, right) : IsTuple(left) ? ExtendsTuple(inferred, left.items, right) : IsUndefined3(left) ? ExtendsUndefined(inferred, left, right) : IsUnion(left) ? ExtendsUnion2(inferred, left.anyOf, right) : IsUnknown(left) ? ExtendsUnknown(inferred, left, right) : IsVoid(left) ? ExtendsVoid(inferred, left, right) : ExtendsFalse();
  }

  // runtime/node_modules/typebox/build/type/engine/interface/instantiate.mjs
  function InterfaceOperation(heritage, properties) {
    const result = EvaluateIntersect([...heritage, _Object_(properties)]);
    return result;
  }
  function InterfaceAction(heritage, properties, options) {
    const result = CanInstantiate(heritage) ? memory_exports.Update(InterfaceOperation(heritage, properties), {}, options) : InterfaceDeferred(heritage, properties, options);
    return result;
  }
  function InterfaceInstantiate(context, state2, heritage, properties, options) {
    const instantiatedHeritage = InstantiateTypes(context, state2, heritage);
    const instantiatedProperties = InstantiateProperties(context, state2, properties);
    return InterfaceAction(instantiatedHeritage, instantiatedProperties, options);
  }

  // runtime/node_modules/typebox/build/type/action/interface.mjs
  function InterfaceDeferred(heritage, properties, options = {}) {
    return Deferred("Interface", [heritage, properties], options);
  }
  function IsInterfaceDeferred(value) {
    return IsSchema(value) && guard_exports.HasPropertyKey(value, "action") && guard_exports.IsEqual(value.action, "Interface");
  }
  function Interface(heritage, properties, options = {}) {
    return InterfaceAction(heritage, properties, options);
  }

  // runtime/node_modules/typebox/build/type/engine/cyclic/check.mjs
  function FromRef(stack, context, ref) {
    return stack.includes(ref) ? true : FromType3([...stack, ref], context, context[ref]);
  }
  function FromProperties(stack, context, properties) {
    const types = PropertyValues(properties);
    return FromTypes2(stack, context, types);
  }
  function FromTypes2(stack, context, types) {
    return guard_exports.ShiftLeft(types, (left, right) => FromType3(stack, context, left) ? true : FromTypes2(stack, context, right), () => false);
  }
  function FromType3(stack, context, type) {
    return IsRef(type) ? FromRef(stack, context, type.$ref) : IsArray3(type) ? FromType3(stack, context, type.items) : IsConstructor3(type) ? FromTypes2(stack, context, [...type.parameters, type.instanceType]) : IsFunction3(type) ? FromTypes2(stack, context, [...type.parameters, type.returnType]) : IsInterfaceDeferred(type) ? FromProperties(stack, context, type.parameters[1]) : IsIntersect(type) ? FromTypes2(stack, context, type.allOf) : IsObject3(type) ? FromProperties(stack, context, type.properties) : IsUnion(type) ? FromTypes2(stack, context, type.anyOf) : IsTuple(type) ? FromTypes2(stack, context, type.items) : IsRecord(type) ? FromType3(stack, context, RecordValue(type)) : false;
  }
  function CyclicCheck(stack, context, type) {
    const result = FromType3(stack, context, type);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/cyclic/candidates.mjs
  function ResolveCandidateKeys(context, keys) {
    return keys.reduce((result, left) => {
      return CyclicCheck([left], context, context[left]) ? [...result, left] : result;
    }, []);
  }
  function CyclicCandidates(context) {
    const keys = PropertyKeys(context);
    const result = ResolveCandidateKeys(context, keys);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/cyclic/dependencies.mjs
  function FromRef2(context, ref, result) {
    return result.includes(ref) ? result : ref in context ? FromType4(context, context[ref], [...result, ref]) : Unreachable();
  }
  function FromProperties2(context, properties, result) {
    const types = PropertyValues(properties);
    return FromTypes3(context, types, result);
  }
  function FromTypes3(context, types, result) {
    return types.reduce((result2, left) => {
      return FromType4(context, left, result2);
    }, result);
  }
  function FromType4(context, type, result) {
    return IsRef(type) ? FromRef2(context, type.$ref, result) : IsArray3(type) ? FromType4(context, type.items, result) : IsConstructor3(type) ? FromTypes3(context, [...type.parameters, type.instanceType], result) : IsFunction3(type) ? FromTypes3(context, [...type.parameters, type.returnType], result) : IsInterfaceDeferred(type) ? FromProperties2(context, type.parameters[1], result) : IsIntersect(type) ? FromTypes3(context, type.allOf, result) : IsObject3(type) ? FromProperties2(context, type.properties, result) : IsUnion(type) ? FromTypes3(context, type.anyOf, result) : IsTuple(type) ? FromTypes3(context, type.items, result) : IsRecord(type) ? FromType4(context, RecordValue(type), result) : result;
  }
  function CyclicDependencies(context, key, type) {
    const result = FromType4(context, type, [key]);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/cyclic/extends.mjs
  function FromRef3(_ref) {
    return Any();
  }
  function FromProperties3(properties) {
    return guard_exports.Keys(properties).reduce((result, key) => {
      return { ...result, [key]: FromType5(properties[key]) };
    }, {});
  }
  function FromTypes4(types) {
    return types.reduce((result, left) => {
      return [...result, FromType5(left)];
    }, []);
  }
  function FromType5(type) {
    return IsRef(type) ? FromRef3(type.$ref) : IsArray3(type) ? _Array_(FromType5(type.items), ArrayOptions(type)) : IsConstructor3(type) ? Constructor(FromTypes4(type.parameters), FromType5(type.instanceType)) : IsFunction3(type) ? _Function_(FromTypes4(type.parameters), FromType5(type.returnType)) : IsIntersect(type) ? Intersect(FromTypes4(type.allOf)) : IsObject3(type) ? _Object_(FromProperties3(type.properties)) : IsRecord(type) ? Record(RecordKey(type), FromType5(RecordValue(type))) : IsUnion(type) ? Union(FromTypes4(type.anyOf)) : IsTuple(type) ? Tuple(FromTypes4(type.items)) : type;
  }
  function CyclicAnyFromParameters(defs, ref) {
    return ref in defs ? FromType5(defs[ref]) : Unknown();
  }
  function CyclicExtends(type) {
    return CyclicAnyFromParameters(type.$defs, type.$ref);
  }

  // runtime/node_modules/typebox/build/type/engine/cyclic/instantiate.mjs
  function CyclicInterface(context, heritage, properties) {
    const instantiatedHeritage = InstantiateTypes(context, State([], []), heritage);
    const instantiatedProperties = InstantiateProperties({}, State([], []), properties);
    const evaluatedInterface = EvaluateIntersect([...instantiatedHeritage, _Object_(instantiatedProperties)]);
    return evaluatedInterface;
  }
  function CyclicDefinitions(context, dependencies) {
    const keys = guard_exports.Keys(context).filter((key) => dependencies.includes(key));
    return keys.reduce((result, key) => {
      const type = context[key];
      const instantiatedType = IsInterfaceDeferred(type) ? CyclicInterface(context, type.parameters[0], type.parameters[1]) : type;
      return { ...result, [key]: instantiatedType };
    }, {});
  }
  function InstantiateCyclic(context, ref, type) {
    const dependencies = CyclicDependencies(context, ref, type);
    const definitions = CyclicDefinitions(context, dependencies);
    const result = Cyclic(definitions, ref);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/cyclic/target.mjs
  function Resolve(defs, ref) {
    return ref in defs ? IsRef(defs[ref]) ? Resolve(defs, defs[ref].$ref) : defs[ref] : Never();
  }
  function CyclicTarget(defs, ref) {
    const result = Resolve(defs, ref);
    return result;
  }

  // runtime/node_modules/typebox/build/type/extends/extends.mjs
  function Canonical(type) {
    return IsCyclic(type) ? CyclicExtends(type) : IsUnsafe(type) ? Unknown() : type;
  }
  function Extends(inferred, left, right) {
    const canonicalLeft = Canonical(left);
    const canonicalRight = Canonical(right);
    return ExtendsLeft(inferred, canonicalLeft, canonicalRight);
  }

  // runtime/node_modules/typebox/build/type/engine/evaluate/compare.mjs
  var ResultEqual = "equal";
  var ResultDisjoint = "disjoint";
  var ResultLeftInside = "left-inside";
  var ResultRightInside = "right-inside";
  function Compare(left, right) {
    const extendsCheck = [
      IsUnknown(left) ? result_exports.ExtendsFalse() : Extends({}, left, right),
      IsUnknown(left) ? result_exports.ExtendsTrue({}) : Extends({}, right, left)
    ];
    return result_exports.IsExtendsTrueLike(extendsCheck[0]) && result_exports.IsExtendsTrueLike(extendsCheck[1]) ? ResultEqual : result_exports.IsExtendsTrueLike(extendsCheck[0]) && result_exports.IsExtendsFalse(extendsCheck[1]) ? ResultLeftInside : result_exports.IsExtendsFalse(extendsCheck[0]) && result_exports.IsExtendsTrueLike(extendsCheck[1]) ? ResultRightInside : ResultDisjoint;
  }

  // runtime/node_modules/typebox/build/type/engine/evaluate/broaden.mjs
  function BroadFilter(type, types) {
    return types.filter((left) => {
      return Compare(type, left) === ResultRightInside ? false : true;
    });
  }
  function IsBroadestType(type, types) {
    const result = types.some((left) => {
      const result2 = Compare(type, left);
      return guard_exports.IsEqual(result2, ResultLeftInside) || guard_exports.IsEqual(result2, ResultEqual);
    });
    return guard_exports.IsEqual(result, false);
  }
  function BroadenType(type, types) {
    const evaluated = EvaluateType(type);
    return IsAny(evaluated) ? [evaluated] : IsBroadestType(evaluated, types) ? [...BroadFilter(evaluated, types), evaluated] : types;
  }
  function BroadenTypes(types) {
    return types.reduce((result, left) => {
      return IsObject3(left) ? [...result, left] : (
        // push
        IsNever(left) ? result : (
          // ignore
          BroadenType(left, result)
        )
      );
    }, []);
  }
  function Broaden(types) {
    const broadened = BroadenTypes(types);
    const flattened = Flatten(broadened);
    return flattened;
  }

  // runtime/node_modules/typebox/build/type/engine/evaluate/instantiate.mjs
  function EvaluateAction(type, options) {
    const result = memory_exports.Update(EvaluateType(type), {}, options);
    return result;
  }
  function EvaluateInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return EvaluateAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/engine/call/distribute_arguments.mjs
  function CollectDistributionNames(expression, result = []) {
    return (
      // Conditional
      IsDeferred(expression) && guard_exports.IsEqual(expression.action, "Conditional") ? IsRef(expression.parameters[0]) ? CollectDistributionNames(expression.parameters[2], CollectDistributionNames(expression.parameters[3], [...result, expression.parameters[0]["$ref"]])) : CollectDistributionNames(expression.parameters[2], CollectDistributionNames(expression.parameters[3], result)) : IsDeferred(expression) && guard_exports.IsEqual(expression.action, "Mapped") ? IsDeferred(expression.parameters[1]) && guard_exports.IsEqual(expression.parameters[1].action, "KeyOf") && IsRef(expression.parameters[1].parameters[0]) ? [...result, expression.parameters[1].parameters[0]["$ref"]] : result : result
    );
  }
  function BuildDistributionArray(parameters, names2) {
    return parameters.reduce((result, left) => [...result, names2.includes(left.name)], []);
  }
  function ZipDistributionArray(arguments_, distributionArray, result = []) {
    return guard_exports.ShiftLeft(arguments_, (argumentLeft, argumentRight) => guard_exports.ShiftLeft(distributionArray, (booleanLeft, booleanRight) => ZipDistributionArray(argumentRight, booleanRight, [...result, [booleanLeft, argumentLeft]]), () => result), () => result);
  }
  function Expand(type) {
    return IsUnion(type) ? [...type.anyOf] : [type];
  }
  function Append(current, type) {
    return current.reduce((result, left) => [...result, [...left, type]], []);
  }
  function Cross(current, variants) {
    return variants.reduce((result, left) => {
      return [...result, ...Append(current, left)];
    }, []);
  }
  function Distribute2(zipped) {
    return zipped.reduce((result, left) => {
      return guard_exports.IsEqual(left[0], true) ? Cross(result, Expand(left[1])) : Cross(result, [left[1]]);
    }, [[]]);
  }
  function DistributeArguments(parameters, arguments_, expression) {
    const distributionNames = CollectDistributionNames(expression);
    const distributionArray = BuildDistributionArray(parameters, distributionNames);
    const zippedArguments = ZipDistributionArray(arguments_, distributionArray);
    return IsDeferred(expression) && guard_exports.IsEqual(expression.action, "Conditional") ? Distribute2(zippedArguments) : IsDeferred(expression) && guard_exports.IsEqual(expression.action, "Mapped") ? Distribute2(zippedArguments) : [arguments_];
  }

  // runtime/node_modules/typebox/build/type/engine/call/resolve_target.mjs
  function FromNotResolvable() {
    return ["(not-resolvable)", Never()];
  }
  function FromNotGeneric() {
    return ["(not-generic)", Never()];
  }
  function FromGeneric(name, parameters, expression) {
    return [name, Generic(parameters, expression)];
  }
  function FromRef4(context, ref, arguments_) {
    return ref in context ? FromType6(context, ref, context[ref], arguments_) : FromNotResolvable();
  }
  function FromType6(context, name, target, arguments_) {
    return IsGeneric(target) ? FromGeneric(name, target.parameters, target.expression) : IsRef(target) ? FromRef4(context, target.$ref, arguments_) : FromNotGeneric();
  }
  function ResolveTarget(context, target, arguments_) {
    return FromType6(context, "(anonymous)", target, arguments_);
  }

  // runtime/node_modules/typebox/build/type/engine/call/resolve_arguments.mjs
  function AssertArgumentExtends(name, type, extends_) {
    if (IsInfer(type) || IsCall(type) || result_exports.IsExtendsTrueLike(Extends({}, type, extends_)))
      return;
    const cause = { parameter: name, expect: extends_, actual: type };
    throw new Error(`Argument for parameter ${name} does not satisfy constraint`, { cause });
  }
  function BindArgument(context, state2, name, extends_, type) {
    const instantiatedArgument = InstantiateType(context, state2, type);
    AssertArgumentExtends(name, instantiatedArgument, extends_);
    return memory_exports.Assign(context, { [name]: instantiatedArgument });
  }
  function BindArguments(context, state2, parameterLeft, parameterRight, arguments_) {
    const instantiatedExtends = InstantiateType(context, state2, parameterLeft.extends);
    const instantiatedEquals = InstantiateType(context, state2, parameterLeft.equals);
    return guard_exports.ShiftLeft(arguments_, (left, right) => BindParameters(BindArgument(context, state2, parameterLeft["name"], instantiatedExtends, left), state2, parameterRight, right), () => BindParameters(BindArgument(context, state2, parameterLeft["name"], instantiatedExtends, instantiatedEquals), state2, parameterRight, []));
  }
  function BindParameters(context, state2, parameters, arguments_) {
    return guard_exports.ShiftLeft(parameters, (left, right) => BindArguments(context, state2, left, right, arguments_), () => context);
  }
  function ResolveArgumentsContext(context, state2, parameters, arguments_) {
    return BindParameters(context, state2, parameters, arguments_);
  }

  // runtime/node_modules/typebox/build/type/engine/call/instantiate.mjs
  function Peek(state2) {
    const result = guard_exports.IsGreaterThan(state2.callstack.length, 0) ? state2.callstack[state2.callstack.length - 1] : "";
    return result;
  }
  function IsTailCall(state2, name) {
    const result = guard_exports.IsEqual(Peek(state2), name);
    return result;
  }
  function CallDispatch(context, state2, target, parameters, expression, arguments_) {
    const argumentsContext = ResolveArgumentsContext(context, state2, parameters, arguments_);
    const returnType = InstantiateType(argumentsContext, State([...state2["callstack"], target["$ref"]], state2["visited"]), expression);
    return InstantiateType(argumentsContext, State([], []), returnType);
  }
  function CallDistributed(context, state2, target, parameters, expression, distributedArguments) {
    return distributedArguments.reduce((result, arguments_) => [...result, CallDispatch(context, state2, target, parameters, expression, arguments_)], []);
  }
  function CallImmediate(context, state2, target, parameters, expression, arguments_) {
    const distributedArguments = DistributeArguments(parameters, arguments_, expression);
    const returnTypes = CallDistributed(context, state2, target, parameters, expression, distributedArguments);
    const result = guard_exports.IsEqual(returnTypes.length, 1) ? returnTypes[0] : EvaluateUnion(returnTypes);
    return result;
  }
  function CallInstantiate(context, state2, target, arguments_) {
    const instantiatedArguments = InstantiateTypes(context, state2, arguments_);
    const resolved = ResolveTarget(context, target, arguments_);
    const name = resolved[0];
    const type = resolved[1];
    const result = IsGeneric(type) ? IsTailCall(state2, name) ? CallConstruct(Ref(name), instantiatedArguments) : CallImmediate(context, state2, Ref(name), type.parameters, type.expression, instantiatedArguments) : CallConstruct(target, instantiatedArguments);
    return result;
  }

  // runtime/node_modules/typebox/build/type/types/call.mjs
  function CallConstruct(target, arguments_) {
    return memory_exports.Create({ ["~kind"]: "Call" }, { type: "call", target, arguments: arguments_ }, {});
  }
  function Call2(target, arguments_) {
    return CallInstantiate({}, State([], []), target, arguments_);
  }
  function IsCall(value) {
    return IsKind(value, "Call");
  }

  // runtime/node_modules/typebox/build/type/engine/immutable/instantiate_remove.mjs
  function RemoveImmutableOperation(type) {
    return memory_exports.Discard(type, ["~immutable"]);
  }
  function RemoveImmutableAction(type, options) {
    const result = memory_exports.Update(RemoveImmutableOperation(type), {}, options);
    return result;
  }
  function RemoveImmutableInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return RemoveImmutableAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/engine/intrinsics/mapping.mjs
  function ApplyMapping(mapping, value) {
    return mapping(value);
  }

  // runtime/node_modules/typebox/build/type/engine/intrinsics/from_literal.mjs
  function FromLiteral3(mapping, value) {
    return guard_exports.IsString(value) ? Literal(ApplyMapping(mapping, value)) : Literal(value);
  }

  // runtime/node_modules/typebox/build/type/engine/intrinsics/from_template_literal.mjs
  function FromTemplateLiteral(mapping, pattern) {
    const evaluated = EvaluateTemplateLiteral(pattern);
    const result = FromType7(mapping, evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/intrinsics/from_union.mjs
  function FromUnion2(mapping, types) {
    const result = types.map((type) => FromType7(mapping, type));
    return Union(result);
  }

  // runtime/node_modules/typebox/build/type/engine/intrinsics/from_type.mjs
  function FromType7(mapping, type) {
    return IsLiteral(type) ? FromLiteral3(mapping, type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral(mapping, type.pattern) : IsUnion(type) ? FromUnion2(mapping, type.anyOf) : type;
  }

  // runtime/node_modules/typebox/build/type/action/capitalize.mjs
  function CapitalizeDeferred(type, options = {}) {
    return Deferred("Capitalize", [type], options);
  }
  function Capitalize(type, options = {}) {
    return CapitalizeAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/action/lowercase.mjs
  function LowercaseDeferred(type, options = {}) {
    return Deferred("Lowercase", [type], options);
  }
  function Lowercase(type, options = {}) {
    return LowercaseAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/action/uncapitalize.mjs
  function UncapitalizeDeferred(type, options = {}) {
    return Deferred("Uncapitalize", [type], options);
  }
  function Uncapitalize(type, options = {}) {
    return UncapitalizeAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/action/uppercase.mjs
  function UppercaseDeferred(type, options = {}) {
    return Deferred("Uppercase", [type], options);
  }
  function Uppercase(type, options = {}) {
    return UppercaseAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/intrinsics/instantiate.mjs
  var CapitalizeMapping = (input) => input[0].toUpperCase() + input.slice(1);
  var LowercaseMapping = (input) => input.toLowerCase();
  var UncapitalizeMapping = (input) => input[0].toLowerCase() + input.slice(1);
  var UppercaseMapping = (input) => input.toUpperCase();
  function CapitalizeAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(FromType7(CapitalizeMapping, type), {}, options) : CapitalizeDeferred(type, options);
    return result;
  }
  function LowercaseAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(FromType7(LowercaseMapping, type), {}, options) : LowercaseDeferred(type, options);
    return result;
  }
  function UncapitalizeAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(FromType7(UncapitalizeMapping, type), {}, options) : UncapitalizeDeferred(type, options);
    return result;
  }
  function UppercaseAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(FromType7(UppercaseMapping, type), {}, options) : UppercaseDeferred(type, options);
    return result;
  }
  function CapitalizeInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return CapitalizeAction(instantiatedType, options);
  }
  function LowercaseInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return LowercaseAction(instantiatedType, options);
  }
  function UncapitalizeInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return UncapitalizeAction(instantiatedType, options);
  }
  function UppercaseInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return UppercaseAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/conditional.mjs
  function ConditionalDeferred(left, right, true_, false_, options = {}) {
    return Deferred("Conditional", [left, right, true_, false_], options);
  }
  function Conditional(left, right, true_, false_, options = {}) {
    return ConditionalAction({}, State([], []), left, right, true_, false_, options);
  }

  // runtime/node_modules/typebox/build/type/engine/conditional/instantiate.mjs
  function ConditionalOperation(context, state2, left, right, true_, false_) {
    const extendsResult = Extends(context, left, right);
    return result_exports.IsExtendsUnion(extendsResult) ? Union([InstantiateType(extendsResult.inferred, state2, true_), InstantiateType(context, state2, false_)]) : result_exports.IsExtendsTrue(extendsResult) ? InstantiateType(extendsResult.inferred, state2, true_) : InstantiateType(context, state2, false_);
  }
  function ConditionalAction(context, state2, left, right, true_, false_, options) {
    const result = CanInstantiate([left, right]) ? memory_exports.Update(ConditionalOperation(context, state2, left, right, true_, false_), {}, options) : ConditionalDeferred(left, right, true_, false_, options);
    return result;
  }
  function ConditionalInstantiate(context, state2, left, right, true_, false_, options) {
    const instantiatedLeft = InstantiateType(context, state2, left);
    const instantiatedRight = InstantiateType(context, state2, right);
    return ConditionalAction(context, state2, instantiatedLeft, instantiatedRight, true_, false_, options);
  }

  // runtime/node_modules/typebox/build/type/action/constructor_parameters.mjs
  function ConstructorParametersDeferred(type, options = {}) {
    return Deferred("ConstructorParameters", [type], options);
  }
  function ConstructorParameters(type, options = {}) {
    return ConstructorParametersAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/constructor_parameters/instantiate.mjs
  function ConstructorParametersOperation(type) {
    const parameters = IsConstructor3(type) ? type["parameters"] : [];
    const instantiatedParameters = InstantiateElements({}, State([], []), parameters);
    const result = Tuple(instantiatedParameters);
    return result;
  }
  function ConstructorParametersAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(ConstructorParametersOperation(type), {}, options) : ConstructorParametersDeferred(type, options);
    return result;
  }
  function ConstructorParametersInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return ConstructorParametersAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/exclude.mjs
  function ExcludeDeferred(left, right, options = {}) {
    return Deferred("Exclude", [left, right], options);
  }
  function Exclude(left, right, options = {}) {
    return ExcludeAction(left, right, options);
  }

  // runtime/node_modules/typebox/build/type/engine/exclude/instantiate.mjs
  function ExcludeAction(left, right, options) {
    const result = CanInstantiate([left, right]) ? memory_exports.Update(ExcludeOperation(left, right), {}, options) : ExcludeDeferred(left, right, options);
    return result;
  }
  function ExcludeInstantiate(context, state2, left, right, options) {
    const instantiatedLeft = InstantiateType(context, state2, left);
    const instantiatedRight = InstantiateType(context, state2, right);
    return ExcludeAction(instantiatedLeft, instantiatedRight, options);
  }

  // runtime/node_modules/typebox/build/type/action/extract.mjs
  function ExtractDeferred(left, right, options = {}) {
    return Deferred("Extract", [left, right], options);
  }
  function Extract(left, right, options = {}) {
    return ExtractAction(left, right, options);
  }

  // runtime/node_modules/typebox/build/type/engine/extract/operation.mjs
  function ExtractType(left, right) {
    const check = Extends({}, left, right);
    const result = result_exports.IsExtendsTrueLike(check) ? [left] : [];
    return result;
  }
  function ExtractUnion(types, right) {
    return types.reduce((result, head) => {
      return [...result, ...ExtractType(head, right)];
    }, []);
  }
  function ExtractOperation(left, right) {
    const evaluated = EvaluateType(left);
    const canonical = IsUnion(evaluated) ? evaluated.anyOf : [evaluated];
    const remaining = ExtractUnion(canonical, right);
    const result = EvaluateUnion(remaining);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/extract/instantiate.mjs
  function ExtractAction(left, right, options) {
    const result = CanInstantiate([left, right]) ? memory_exports.Update(ExtractOperation(left, right), {}, options) : ExtractDeferred(left, right, options);
    return result;
  }
  function ExtractInstantiate(context, state2, left, right, options) {
    const instantiatedLeft = InstantiateType(context, state2, left);
    const instantiatedRight = InstantiateType(context, state2, right);
    return ExtractAction(instantiatedLeft, instantiatedRight, options);
  }

  // runtime/node_modules/typebox/build/type/engine/helpers/keys_to_indexer.mjs
  function KeysToLiterals(keys) {
    return keys.reduce((result, left) => {
      return IsLiteralValue(left) ? [...result, Literal(left)] : result;
    }, []);
  }
  function KeysToIndexer(keys) {
    const literals = KeysToLiterals(keys);
    const result = Union(literals);
    return result;
  }

  // runtime/node_modules/typebox/build/type/action/indexed.mjs
  function IndexDeferred(type, indexer, options = {}) {
    return Deferred("Index", [type, indexer], options);
  }
  function Index(type, indexer_or_keys, options = {}) {
    const indexer = guard_exports.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
    return IndexAction(type, indexer, options);
  }

  // runtime/node_modules/typebox/build/type/engine/object/from_cyclic.mjs
  function FromCyclic(defs, ref) {
    const target = CyclicTarget(defs, ref);
    const result = FromType8(target);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/object/from_dependent.mjs
  function FromDependent(if_, then_, else_) {
    const evaluated = EvaluateDependent(if_, then_, else_);
    const result = FromType8(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/object/from_intersect.mjs
  function CollapseIntersectProperties(left, right) {
    const leftKeys = guard_exports.Keys(left).filter((key) => !guard_exports.HasPropertyKey(right, key));
    const rightKeys = guard_exports.Keys(right).filter((key) => !guard_exports.HasPropertyKey(left, key));
    const sharedKeys = guard_exports.Keys(left).filter((key) => guard_exports.HasPropertyKey(right, key));
    const leftProperties = leftKeys.reduce((result, key) => ({ ...result, [key]: left[key] }), {});
    const rightProperties = rightKeys.reduce((result, key) => ({ ...result, [key]: right[key] }), {});
    const sharedProperties = sharedKeys.reduce((result, key) => ({ ...result, [key]: EvaluateIntersect([left[key], right[key]]) }), {});
    const unique = memory_exports.Assign(leftProperties, rightProperties);
    const shared = memory_exports.Assign(unique, sharedProperties);
    return shared;
  }
  function FromIntersect(types) {
    return types.reduce((result, left) => {
      return CollapseIntersectProperties(result, FromType8(left));
    }, {});
  }

  // runtime/node_modules/typebox/build/type/engine/object/from_object.mjs
  function FromObject4(properties) {
    return properties;
  }

  // runtime/node_modules/typebox/build/type/engine/object/from_tuple.mjs
  function FromTuple(types) {
    const object = TupleToObject(Tuple(types));
    const result = FromType8(object);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/object/from_union.mjs
  function CollapseUnionProperties(left, right) {
    const sharedKeys = guard_exports.Keys(left).filter((key) => key in right);
    const result = sharedKeys.reduce((result2, key) => {
      return { ...result2, [key]: EvaluateUnion([left[key], right[key]]) };
    }, {});
    return result;
  }
  function ReduceVariants(types, result) {
    return guard_exports.ShiftLeft(types, (left, right) => ReduceVariants(right, CollapseUnionProperties(result, FromType8(left))), () => result);
  }
  function FromUnion3(types) {
    return guard_exports.ShiftLeft(types, (left, right) => ReduceVariants(right, FromType8(left)), () => Unreachable());
  }

  // runtime/node_modules/typebox/build/type/engine/object/from_type.mjs
  function FromType8(type) {
    return IsCyclic(type) ? FromCyclic(type.$defs, type.$ref) : IsDependent(type) ? FromDependent(type.if, type.then, type.else) : IsIntersect(type) ? FromIntersect(type.allOf) : IsUnion(type) ? FromUnion3(type.anyOf) : IsTuple(type) ? FromTuple(type.items) : IsObject3(type) ? FromObject4(type.properties) : {};
  }

  // runtime/node_modules/typebox/build/type/engine/object/collapse.mjs
  function CollapseToObject(type) {
    const properties = FromType8(type);
    const result = _Object_(properties);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/helpers/keys.mjs
  var integerKeyPattern = new RegExp("^(?:0|[1-9][0-9]*)$");
  function ConvertToIntegerKey(value) {
    const normal = `${value}`;
    return integerKeyPattern.test(normal) ? parseInt(normal) : value;
  }

  // runtime/node_modules/typebox/build/type/engine/indexed/from_array.mjs
  function NormalizeLiteral(value) {
    return Literal(ConvertToIntegerKey(value));
  }
  function NormalizeIndexerTypes(types) {
    return types.map((type) => NormalizeIndexer(type));
  }
  function NormalizeIndexer(type) {
    return IsIntersect(type) ? Intersect(NormalizeIndexerTypes(type.allOf)) : IsUnion(type) ? Union(NormalizeIndexerTypes(type.anyOf)) : IsLiteral(type) ? NormalizeLiteral(type.const) : type;
  }
  function FromArray3(type, indexer) {
    const normalizedIndexer = NormalizeIndexer(indexer);
    const check = Extends({}, normalizedIndexer, Number2());
    const result = (
      // indexer
      result_exports.IsExtendsTrueLike(check) ? type : IsLiteral(indexer) && guard_exports.IsEqual(indexer.const, "length") ? Number2() : Never()
    );
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/indexable/from_cyclic.mjs
  function FromCyclic2(defs, ref) {
    const target = CyclicTarget(defs, ref);
    const result = FromType9(target);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/indexable/from_dependent.mjs
  function FromDependent2(if_, then_, else_) {
    const evaluated = EvaluateDependent(if_, then_, else_);
    const result = FromType9(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/indexable/from_enum.mjs
  function FromEnum(values) {
    const evaluated = EvaluateEnum(values);
    const result = FromType9(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/indexable/from_intersect.mjs
  function FromIntersect2(types) {
    const evaluated = EvaluateIntersect(types);
    const result = FromType9(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/indexable/from_literal.mjs
  function FromLiteral4(value) {
    const result = [`${value}`];
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/indexable/from_template_literal.mjs
  function FromTemplateLiteral2(pattern) {
    const evaluated = EvaluateTemplateLiteral(pattern);
    const result = FromType9(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/indexable/from_union.mjs
  function FromUnion4(types) {
    return types.reduce((result, left) => {
      return [...result, ...FromType9(left)];
    }, []);
  }

  // runtime/node_modules/typebox/build/type/engine/indexable/from_type.mjs
  function FromType9(type) {
    return IsCyclic(type) ? FromCyclic2(type.$defs, type.$ref) : IsDependent(type) ? FromDependent2(type.if, type.then, type.else) : IsEnum(type) ? FromEnum(type.enum) : IsIntersect(type) ? FromIntersect2(type.allOf) : IsLiteral(type) ? FromLiteral4(type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral2(type.pattern) : IsUnion(type) ? FromUnion4(type.anyOf) : [];
  }

  // runtime/node_modules/typebox/build/type/engine/indexable/to_indexable_keys.mjs
  function ToIndexableKeys(type) {
    const result = FromType9(type);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/this/expand_this.mjs
  function FromTypes5(properties, types) {
    return types.map((type) => FromType10(properties, type));
  }
  function FromType10(properties, type) {
    return IsArray3(type) ? _Array_(FromType10(properties, type.items)) : IsConstructor3(type) ? Constructor(FromTypes5(properties, type.parameters), FromType10(properties, type.instanceType)) : IsFunction3(type) ? _Function_(FromTypes5(properties, type.parameters), FromType10(properties, type.returnType)) : IsTuple(type) ? Tuple(FromTypes5(properties, type.items)) : IsUnion(type) ? Union(FromTypes5(properties, type.anyOf)) : IsIntersect(type) ? Intersect(FromTypes5(properties, type.allOf)) : IsThis(type) ? _Object_(properties) : type;
  }
  function ExpandThis(properties, type) {
    const result = FromType10(properties, type);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/indexed/from_object.mjs
  function IndexProperty(properties, key) {
    const selectedType = key in properties ? properties[key] : Never();
    const result = ExpandThis(properties, selectedType);
    return result;
  }
  function IndexProperties(properties, keys) {
    return keys.reduce((result, left) => {
      return [...result, IndexProperty(properties, left)];
    }, []);
  }
  function FromIndexer(properties, indexer) {
    const keys = ToIndexableKeys(indexer);
    const variants = IndexProperties(properties, keys);
    const result = EvaluateUnion(variants);
    return result;
  }
  var NumericKeyPattern = new RegExp(IntegerKey);
  function NumericKeys(keys) {
    const result = keys.filter((key) => NumericKeyPattern.test(key));
    return result;
  }
  function FromIndexerNumber(properties) {
    const keys = PropertyKeys(properties);
    const numericKeys = NumericKeys(keys);
    const variants = IndexProperties(properties, numericKeys);
    const result = EvaluateUnion(variants);
    return result;
  }
  function FromObject5(properties, indexer) {
    const result = IsNumber4(indexer) ? FromIndexerNumber(properties) : FromIndexer(properties, indexer);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/indexed/array_indexer.mjs
  function ConvertLiteral(value) {
    return Literal(ConvertToIntegerKey(value));
  }
  function ArrayIndexerTypes(types) {
    return types.map((type) => FormatArrayIndexer(type));
  }
  function FormatArrayIndexer(type) {
    return IsIntersect(type) ? Intersect(ArrayIndexerTypes(type.allOf)) : IsUnion(type) ? Union(ArrayIndexerTypes(type.anyOf)) : IsLiteral(type) ? ConvertLiteral(type.const) : type;
  }

  // runtime/node_modules/typebox/build/type/engine/indexed/from_tuple.mjs
  function IndexElementsWithIndexer(types, indexer) {
    return types.reduceRight((result, right, index3) => {
      const check = Extends({}, Literal(index3), indexer);
      return result_exports.IsExtendsTrueLike(check) ? [right, ...result] : result;
    }, []);
  }
  function FromTupleWithIndexer(types, indexer) {
    const formattedArrayIndexer = FormatArrayIndexer(indexer);
    const elements = IndexElementsWithIndexer(types, formattedArrayIndexer);
    return EvaluateUnionFast(elements);
  }
  function FromTupleWithoutIndexer(types) {
    return EvaluateUnionFast(types);
  }
  function FromTuple2(types, indexer) {
    return (
      // length (intrinsic)
      IsLiteral(indexer) && guard_exports.IsEqual(indexer.const, "length") ? Literal(types.length) : IsNumber4(indexer) || IsInteger3(indexer) ? FromTupleWithoutIndexer(types) : FromTupleWithIndexer(types, indexer)
    );
  }

  // runtime/node_modules/typebox/build/type/engine/indexed/from_type.mjs
  function FromType11(type, indexer) {
    return IsArray3(type) ? FromArray3(type.items, indexer) : IsObject3(type) ? FromObject5(type.properties, indexer) : IsTuple(type) ? FromTuple2(type.items, indexer) : Never();
  }

  // runtime/node_modules/typebox/build/type/engine/indexed/instantiate.mjs
  function NormalizeType(type) {
    const result = IsCyclic(type) || IsDependent(type) || IsIntersect(type) || IsUnion(type) ? CollapseToObject(type) : type;
    return result;
  }
  function IndexAction(type, indexer, options) {
    const result = CanInstantiate([type, indexer]) ? memory_exports.Update(FromType11(NormalizeType(type), indexer), {}, options) : IndexDeferred(type, indexer, options);
    return result;
  }
  function IndexInstantiate(context, state2, type, indexer, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    const instantiatedIndexer = InstantiateType(context, state2, indexer);
    return IndexAction(instantiatedType, instantiatedIndexer, options);
  }

  // runtime/node_modules/typebox/build/type/action/instance_type.mjs
  function InstanceTypeDeferred(type, options = {}) {
    return Deferred("InstanceType", [type], options);
  }
  function InstanceType(type, options = {}) {
    return InstanceTypeAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/instance_type/instantiate.mjs
  function InstanceTypeOperation(type) {
    return IsConstructor3(type) ? type["instanceType"] : Never();
  }
  function InstanceTypeAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(InstanceTypeOperation(type), {}, options) : InstanceTypeDeferred(type, options);
    return result;
  }
  function InstanceTypeInstantiate(context, state2, type, options = {}) {
    const instantiatedType = InstantiateType(context, state2, type);
    return InstanceTypeAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/keyof.mjs
  function KeyOfDeferred(type, options = {}) {
    return Deferred("KeyOf", [type], options);
  }
  function KeyOf2(type, options = {}) {
    return KeyOfAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/keyof/from_any.mjs
  function FromAny() {
    return Union([Number2(), String2(), Symbol2()]);
  }

  // runtime/node_modules/typebox/build/type/engine/keyof/from_array.mjs
  function FromArray4(_type) {
    return Number2();
  }

  // runtime/node_modules/typebox/build/type/engine/keyof/from_object.mjs
  function FromPropertyKeys(keys) {
    const result = keys.reduce((result2, left) => {
      return IsLiteralValue(left) ? [...result2, Literal(ConvertToIntegerKey(left))] : Unreachable();
    }, []);
    return result;
  }
  function FromObject6(properties) {
    const propertyKeys = guard_exports.Keys(properties);
    const variants = FromPropertyKeys(propertyKeys);
    const result = EvaluateUnionFast(variants);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/keyof/from_record.mjs
  function FromRecord2(type) {
    return RecordKey(type);
  }

  // runtime/node_modules/typebox/build/type/engine/keyof/from_tuple.mjs
  function FromTuple3(types) {
    const result = types.map((_, index3) => Literal(index3));
    return EvaluateUnionFast(result);
  }

  // runtime/node_modules/typebox/build/type/engine/keyof/from_type.mjs
  function FromType12(type) {
    return IsAny(type) ? FromAny() : IsArray3(type) ? FromArray4(type.items) : IsObject3(type) ? FromObject6(type.properties) : IsRecord(type) ? FromRecord2(type) : IsTuple(type) ? FromTuple3(type.items) : Never();
  }

  // runtime/node_modules/typebox/build/type/engine/keyof/instantiate.mjs
  function NormalizeType2(type) {
    const result = IsCyclic(type) || IsDependent(type) || IsIntersect(type) || IsUnion(type) ? CollapseToObject(type) : type;
    return result;
  }
  function KeyOfAction(type, options) {
    return CanInstantiate([type]) ? memory_exports.Update(FromType12(NormalizeType2(type)), {}, options) : KeyOfDeferred(type, options);
  }
  function KeyOfInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return KeyOfAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/mapped.mjs
  function MappedDeferred(identifier, type, as, property, options = {}) {
    return Deferred("Mapped", [identifier, type, as, property], options);
  }
  function Mapped(identifier, type, as, property, options = {}) {
    return MappedAction({}, State([], []), identifier, type, as, property, options);
  }

  // runtime/node_modules/typebox/build/type/engine/mapped/mapped_variants.mjs
  function FromTemplateLiteral3(pattern) {
    const evaluated = EvaluateTemplateLiteral(pattern);
    const result = FromType13(evaluated);
    return result;
  }
  function FromUnion5(types) {
    return types.reduce((result, left) => {
      return [...result, ...FromType13(left)];
    }, []);
  }
  function FromEnum2(values) {
    const evaluated = EvaluateEnum(values);
    const result = FromType13(evaluated);
    return result;
  }
  function FromLiteral5(value) {
    const result = guard_exports.IsNumber(value) ? [Literal(`${value}`)] : [Literal(value)];
    return result;
  }
  function FromType13(type) {
    const result = IsEnum(type) ? FromEnum2(type.enum) : IsLiteral(type) ? FromLiteral5(type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral3(type.pattern) : IsUnion(type) ? FromUnion5(type.anyOf) : [type];
    return result;
  }
  function MappedVariants(type) {
    const result = FromType13(type);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/mapped/mapped_operation.mjs
  function CanonicalAs(instantiatedAs) {
    const result = IsTemplateLiteral(instantiatedAs) ? EvaluateTemplateLiteral(instantiatedAs.pattern) : instantiatedAs;
    return result;
  }
  function MappedVariant(context, state2, identifier, variant, as, property) {
    const variantContext = memory_exports.Assign(context, { [identifier["name"]]: variant });
    const instantiatedAs = InstantiateType(variantContext, state2, as);
    const canonicalAs = CanonicalAs(instantiatedAs);
    const instantiatedProperty = InstantiateType(variantContext, state2, property);
    return IsLiteralNumber(canonicalAs) || IsLiteralString(canonicalAs) ? { [canonicalAs.const]: instantiatedProperty } : {};
  }
  function MappedProperties(context, state2, identifier, variants, as, property) {
    return variants.reduce((result, left) => {
      return [...result, MappedVariant(context, state2, identifier, left, as, property)];
    }, []);
  }
  function MappedObjects(properties) {
    return properties.reduce((result, left) => {
      return [...result, _Object_(left)];
    }, []);
  }
  function MappedOperation(context, state2, identifier, type, as, property) {
    const variants = MappedVariants(type);
    const mappedProperties = MappedProperties(context, state2, identifier, variants, as, property);
    const mappedObjects = MappedObjects(mappedProperties);
    const result = EvaluateIntersect(mappedObjects);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/mapped/instantiate.mjs
  function MappedAction(context, state2, identifier, type, as, property, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(MappedOperation(context, state2, identifier, type, as, property), {}, options) : MappedDeferred(identifier, type, as, property, options);
    return result;
  }
  function MappedInstantiate(context, state2, identifier, type, as, property, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return MappedAction(context, state2, identifier, instantiatedType, as, property, options);
  }

  // runtime/node_modules/typebox/build/type/engine/module/instantiate.mjs
  function InstantiateCyclics(context, declarations, cyclicKeys) {
    const declarationContext = memory_exports.Assign(context, declarations);
    const declarationKeys = guard_exports.Keys(declarations).filter((key) => cyclicKeys.includes(key));
    return declarationKeys.reduce((result, key) => {
      return { ...result, [key]: InstantiateCyclic(declarationContext, key, declarations[key]) };
    }, {});
  }
  function InstantiateNonCyclics(context, declarations, cyclicKeys) {
    const declarationContext = memory_exports.Assign(context, declarations);
    const declarationKeys = guard_exports.Keys(declarations).filter((key) => !cyclicKeys.includes(key));
    return declarationKeys.reduce((result, key) => {
      return { ...result, [key]: InstantiateType(declarationContext, State([], []), declarations[key]) };
    }, {});
  }
  function InstantiateModule(context, declarations, options) {
    const cyclicCandidates = CyclicCandidates(declarations);
    const instantiatedCyclics = InstantiateCyclics(context, declarations, cyclicCandidates);
    const instantiatedNonCyclics = InstantiateNonCyclics(context, declarations, cyclicCandidates);
    const instantiatedModule = { ...instantiatedCyclics, ...instantiatedNonCyclics };
    return memory_exports.Update(instantiatedModule, {}, options);
  }
  function ModuleInstantiate(context, _state, declarations, options) {
    const instantiatedModule = InstantiateModule(context, declarations, options);
    return instantiatedModule;
  }

  // runtime/node_modules/typebox/build/type/action/non_nullable.mjs
  function NonNullableDeferred(type, options = {}) {
    return Deferred("NonNullable", [type], options);
  }
  function NonNullable(type, options = {}) {
    return NonNullableAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/non_nullable/instantiate.mjs
  function NonNullableOperation(type) {
    const excluded = Union([Null(), Undefined()]);
    return ExcludeAction(type, excluded, {});
  }
  function NonNullableAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(NonNullableOperation(type), {}, options) : NonNullableDeferred(type, options);
    return result;
  }
  function NonNullableInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return NonNullableAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/omit.mjs
  function OmitDeferred(type, indexer, options = {}) {
    return Deferred("Omit", [type, indexer], options);
  }
  function Omit(type, indexer_or_keys, options = {}) {
    const indexer = guard_exports.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
    return OmitAction(type, indexer, options);
  }

  // runtime/node_modules/typebox/build/type/engine/indexable/to_indexable.mjs
  function ToIndexable(type) {
    const collapsed = CollapseToObject(type);
    const result = IsObject3(collapsed) ? collapsed.properties : Unreachable();
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/omit/from_type.mjs
  function FromKeys(properties, keys) {
    const result = guard_exports.Keys(properties).reduce((result2, key) => {
      return keys.includes(key) ? result2 : { ...result2, [key]: properties[key] };
    }, {});
    return result;
  }
  function FromType14(type, indexer) {
    const indexable = ToIndexable(type);
    const indexableKeys = ToIndexableKeys(indexer);
    const omitted = FromKeys(indexable, indexableKeys);
    const result = _Object_(omitted);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/omit/instantiate.mjs
  function OmitAction(type, indexer, options) {
    const result = CanInstantiate([type, indexer]) ? memory_exports.Update(FromType14(type, indexer), {}, options) : OmitDeferred(type, indexer, options);
    return result;
  }
  function OmitInstantiate(context, state2, type, indexer, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    const instantiatedIndexer = InstantiateType(context, state2, indexer);
    return OmitAction(instantiatedType, instantiatedIndexer, options);
  }

  // runtime/node_modules/typebox/build/type/action/parameters.mjs
  function ParametersDeferred(type, options = {}) {
    return Deferred("Parameters", [type], options);
  }
  function Parameters(type, options = {}) {
    return ParametersAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/parameters/instantiate.mjs
  function ParametersOperation(type) {
    const parameters = IsFunction3(type) ? type["parameters"] : [];
    const instantiatedParameters = InstantiateElements({}, State([], []), parameters);
    const result = Tuple(instantiatedParameters);
    return result;
  }
  function ParametersAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(ParametersOperation(type), {}, options) : ParametersDeferred(type, options);
    return result;
  }
  function ParametersInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return ParametersAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/partial.mjs
  function PartialDeferred(type, options = {}) {
    return Deferred("Partial", [type], options);
  }
  function Partial(type, options = {}) {
    return PartialAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/partial/from_cyclic.mjs
  function FromCyclic3(defs, ref) {
    const target = CyclicTarget(defs, ref);
    const partial = FromType15(target);
    const result = Cyclic(memory_exports.Assign(defs, { [ref]: partial }), ref);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/partial/from_dependent.mjs
  function FromDependent3(if_, then_, else_) {
    const evaluated = EvaluateDependent(if_, then_, else_);
    const result = FromType15(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/partial/from_intersect.mjs
  function FromIntersect3(types) {
    const evaluated = EvaluateIntersect(types);
    const result = FromType15(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/partial/from_union.mjs
  function FromUnion6(types) {
    const result = types.map((type) => FromType15(type));
    return Union(result);
  }

  // runtime/node_modules/typebox/build/type/engine/partial/from_object.mjs
  function FromObject7(properties) {
    const mapped = guard_exports.Keys(properties).reduce((result2, left) => {
      return { ...result2, [left]: AddOptional(properties[left]) };
    }, {});
    const result = _Object_(mapped);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/partial/from_type.mjs
  function FromType15(type) {
    return IsCyclic(type) ? FromCyclic3(type.$defs, type.$ref) : IsDependent(type) ? FromDependent3(type.if, type.then, type.else) : IsIntersect(type) ? FromIntersect3(type.allOf) : IsUnion(type) ? FromUnion6(type.anyOf) : IsObject3(type) ? FromObject7(type.properties) : _Object_({});
  }

  // runtime/node_modules/typebox/build/type/engine/partial/instantiate.mjs
  function PartialAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(FromType15(type), {}, options) : PartialDeferred(type, options);
    return result;
  }
  function PartialInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return PartialAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/pick.mjs
  function PickDeferred(type, indexer, options = {}) {
    return Deferred("Pick", [type, indexer], options);
  }
  function Pick(type, indexer_or_keys, options = {}) {
    const indexer = guard_exports.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
    return PickAction(type, indexer, options);
  }

  // runtime/node_modules/typebox/build/type/engine/pick/from_type.mjs
  function FromKeys2(properties, keys) {
    const result = guard_exports.Keys(properties).reduce((result2, key) => {
      return keys.includes(key) ? memory_exports.Assign(result2, { [key]: properties[key] }) : result2;
    }, {});
    return result;
  }
  function FromType16(type, indexer) {
    const indexable = ToIndexable(type);
    const keys = ToIndexableKeys(indexer);
    const applied = FromKeys2(indexable, keys);
    const result = _Object_(applied);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/pick/instantiate.mjs
  function PickAction(type, indexer, options) {
    const result = CanInstantiate([type, indexer]) ? memory_exports.Update(FromType16(type, indexer), {}, options) : PickDeferred(type, indexer, options);
    return result;
  }
  function PickInstantiate(context, state2, type, indexer, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    const instantiatedIndexer = InstantiateType(context, state2, indexer);
    return PickAction(instantiatedType, instantiatedIndexer, options);
  }

  // runtime/node_modules/typebox/build/type/action/readonly_object.mjs
  function ReadonlyObjectDeferred(type, options = {}) {
    return Deferred("ReadonlyObject", [type], options);
  }
  function ReadonlyObject(type, options = {}) {
    return ReadonlyObjectAction(type, options);
  }
  var ReadonlyType = ReadonlyObject;

  // runtime/node_modules/typebox/build/type/engine/readonly_object/from_array.mjs
  function FromArray5(type) {
    const result = AddImmutable(_Array_(type));
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/readonly_object/from_cyclic.mjs
  function FromCyclic4(defs, ref) {
    const target = CyclicTarget(defs, ref);
    const partial = FromType17(target);
    const result = Cyclic(memory_exports.Assign(defs, { [ref]: partial }), ref);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/readonly_object/from_dependent.mjs
  function FromDependent4(if_, then_, else_) {
    const evaluated = EvaluateDependent(if_, then_, else_);
    const result = FromType17(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/readonly_object/from_intersect.mjs
  function FromIntersect4(types) {
    const evaluated = EvaluateIntersect(types);
    const result = FromType17(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/readonly_object/from_object.mjs
  function FromObject8(properties) {
    const mapped = guard_exports.Keys(properties).reduce((result2, left) => {
      return { ...result2, [left]: AddReadonly(properties[left]) };
    }, {});
    const result = _Object_(mapped);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/readonly_object/from_tuple.mjs
  function FromTuple4(types) {
    const result = AddImmutable(Tuple(types));
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/readonly_object/from_union.mjs
  function FromUnion7(types) {
    const result = types.map((type) => FromType17(type));
    return Union(result);
  }

  // runtime/node_modules/typebox/build/type/engine/readonly_object/from_type.mjs
  function FromType17(type) {
    return IsArray3(type) ? FromArray5(type.items) : IsCyclic(type) ? FromCyclic4(type.$defs, type.$ref) : IsDependent(type) ? FromDependent4(type.if, type.then, type.else) : IsIntersect(type) ? FromIntersect4(type.allOf) : IsObject3(type) ? FromObject8(type.properties) : IsTuple(type) ? FromTuple4(type.items) : IsUnion(type) ? FromUnion7(type.anyOf) : type;
  }

  // runtime/node_modules/typebox/build/type/engine/readonly_object/instantiate.mjs
  function ReadonlyObjectAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(FromType17(type), {}, options) : ReadonlyObjectDeferred(type);
    return result;
  }
  function ReadonlyObjectInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return ReadonlyObjectAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/engine/ref/instantiate.mjs
  function RefInstantiate(context, state2, type, ref) {
    return state2.visited.includes(ref) ? type : ref in context ? InstantiateType(context, State(state2["callstack"], [...state2["visited"], ref]), context[ref]) : type;
  }

  // runtime/node_modules/typebox/build/type/engine/required/from_cyclic.mjs
  function FromCyclic5(defs, ref) {
    const target = CyclicTarget(defs, ref);
    const partial = FromType18(target);
    const result = Cyclic(memory_exports.Assign(defs, { [ref]: partial }), ref);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/required/from_dependent.mjs
  function FromDependent5(if_, then_, else_) {
    const evaluated = EvaluateDependent(if_, then_, else_);
    const result = FromType18(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/required/from_intersect.mjs
  function FromIntersect5(types) {
    const evaluated = EvaluateIntersect(types);
    const result = FromType18(evaluated);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/required/from_union.mjs
  function FromUnion8(types) {
    const result = types.map((type) => FromType18(type));
    return Union(result);
  }

  // runtime/node_modules/typebox/build/type/engine/required/from_object.mjs
  function FromObject9(properties) {
    const mapped = guard_exports.Keys(properties).reduce((result2, left) => {
      return { ...result2, [left]: RemoveOptional(properties[left]) };
    }, {});
    const result = _Object_(mapped);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/required/from_type.mjs
  function FromType18(type) {
    return IsCyclic(type) ? FromCyclic5(type.$defs, type.$ref) : IsDependent(type) ? FromDependent5(type.if, type.then, type.else) : IsIntersect(type) ? FromIntersect5(type.allOf) : IsUnion(type) ? FromUnion8(type.anyOf) : IsObject3(type) ? FromObject9(type.properties) : _Object_({});
  }

  // runtime/node_modules/typebox/build/type/action/required.mjs
  function RequiredDeferred(type, options = {}) {
    return Deferred("Required", [type], options);
  }
  function Required(type, options = {}) {
    return RequiredAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/required/instantiate.mjs
  function RequiredAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(FromType18(type), {}, options) : RequiredDeferred(type, options);
    return result;
  }
  function RequiredInstantiate(context, state2, type, options) {
    const instaniatedType = InstantiateType(context, state2, type);
    return RequiredAction(instaniatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/return_type.mjs
  function ReturnTypeDeferred(type, options = {}) {
    return Deferred("ReturnType", [type], options);
  }
  function ReturnType(type, options = {}) {
    return ReturnTypeAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/return_type/instantiate.mjs
  function ReturnTypeOperation(type) {
    return IsFunction3(type) ? type["returnType"] : Never();
  }
  function ReturnTypeAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(ReturnTypeOperation(type), {}, options) : ReturnTypeDeferred(type, options);
    return result;
  }
  function ReturnTypeInstantiate(context, state2, type, options = {}) {
    const instantiatedType = InstantiateType(context, state2, type);
    return ReturnTypeAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/with.mjs
  function WithDeferred(type, options) {
    return Deferred("With", [type, options], {});
  }
  function With2(type, options) {
    return WithAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/engine/with/instantiate.mjs
  function WithAction(type, options) {
    const result = CanInstantiate([type]) ? memory_exports.Update(type, {}, options) : WithDeferred(type, options);
    return result;
  }
  function WithInstantiate(context, state2, type, options) {
    const instaniatedType = InstantiateType(context, state2, type);
    return WithAction(instaniatedType, options);
  }

  // runtime/node_modules/typebox/build/type/engine/rest/spread.mjs
  function SpreadElement(type) {
    const result = IsRest(type) ? IsTuple(type.items) ? RestSpread(type.items.items) : IsInfer(type.items) ? [type] : IsRef(type.items) ? [type] : [Never()] : [type];
    return result;
  }
  function RestSpread(types) {
    const result = types.reduce((result2, left) => {
      return [...result2, ...SpreadElement(left)];
    }, []);
    return result;
  }

  // runtime/node_modules/typebox/build/type/engine/instantiate.mjs
  function State(callstack, visited2) {
    return { callstack, visited: visited2 };
  }
  function CanInstantiate(types) {
    return guard_exports.ShiftLeft(types, (left, right) => IsRef(left) ? false : CanInstantiate(right), () => true);
  }
  function InstantiateProperties(context, state2, properties) {
    return guard_exports.Keys(properties).reduce((result, key) => {
      return { ...result, [key]: InstantiateType(context, state2, properties[key]) };
    }, {});
  }
  function InstantiateElements(context, state2, types) {
    const elements = InstantiateTypes(context, state2, types);
    const result = RestSpread(elements);
    return result;
  }
  function InstantiateTypes(context, state2, types) {
    return types.map((type) => InstantiateType(context, state2, type));
  }
  function WithModifiers(type, instantiatedType) {
    const withOptional = IsOptional(type) ? AddOptionalAction(instantiatedType, {}) : instantiatedType;
    const withReadonly = IsReadonly(type) ? AddReadonlyAction(withOptional, {}) : withOptional;
    const withImmutable = IsImmutable(type) ? AddImmutableAction(withReadonly, {}) : withReadonly;
    return withImmutable;
  }
  function InstantiateDeferred(context, state2, action, parameters, options) {
    return (
      // Modifiers
      guard_exports.IsEqual(action, "AddImmutable") ? AddImmutableInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "RemoveImmutable") ? RemoveImmutableInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "AddReadonly") ? AddReadonlyInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "RemoveReadonly") ? RemoveReadonlyInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "AddOptional") ? AddOptionalInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "RemoveOptional") ? RemoveOptionalInstantiate(context, state2, parameters[0], options) : (
        // Actions
        guard_exports.IsEqual(action, "Capitalize") ? CapitalizeInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Conditional") ? ConditionalInstantiate(context, state2, parameters[0], parameters[1], parameters[2], parameters[3], options) : guard_exports.IsEqual(action, "ConstructorParameters") ? ConstructorParametersInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Evaluate") ? EvaluateInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Exclude") ? ExcludeInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Extract") ? ExtractInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Index") ? IndexInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "InstanceType") ? InstanceTypeInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Interface") ? InterfaceInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "KeyOf") ? KeyOfInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Lowercase") ? LowercaseInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Mapped") ? MappedInstantiate(context, state2, parameters[0], parameters[1], parameters[2], parameters[3], options) : guard_exports.IsEqual(action, "Module") ? ModuleInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "NonNullable") ? NonNullableInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Pick") ? PickInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Parameters") ? ParametersInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Partial") ? PartialInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Omit") ? OmitInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "ReadonlyObject") ? ReadonlyObjectInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Record") ? RecordInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Required") ? RequiredInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "ReturnType") ? ReturnTypeInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "TemplateLiteral") ? TemplateLiteralInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Uncapitalize") ? UncapitalizeInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Uppercase") ? UppercaseInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "With") ? WithInstantiate(context, state2, parameters[0], parameters[1]) : Deferred(action, parameters, options)
      )
    );
  }
  function InstantiateImmediate(context, state2, type) {
    const instantiatedType = IsRef(type) ? RefInstantiate(context, state2, type, type.$ref) : IsArray3(type) ? _Array_(InstantiateType(context, state2, type.items), ArrayOptions(type)) : IsCall(type) ? CallInstantiate(context, state2, type.target, type.arguments) : IsConstructor3(type) ? Constructor(InstantiateTypes(context, state2, type.parameters), InstantiateType(context, state2, type.instanceType), ConstructorOptions(type)) : IsFunction3(type) ? _Function_(InstantiateTypes(context, state2, type.parameters), InstantiateType(context, state2, type.returnType), FunctionOptions(type)) : IsDependent(type) ? Dependent(InstantiateType(context, state2, type.if), InstantiateType(context, state2, type.then), InstantiateType(context, state2, type.else), DependentOptions(type)) : IsIntersect(type) ? Intersect(InstantiateTypes(context, state2, type.allOf), IntersectOptions(type)) : IsObject3(type) ? _Object_(InstantiateProperties(context, state2, type.properties), ObjectOptions(type)) : IsRecord(type) ? RecordFromPattern(RecordPattern(type), InstantiateType(context, state2, RecordValue(type))) : IsRest(type) ? Rest(InstantiateType(context, state2, type.items)) : IsTuple(type) ? Tuple(InstantiateElements(context, state2, type.items), TupleOptions(type)) : IsUnion(type) ? Union(InstantiateTypes(context, state2, type.anyOf), UnionOptions(type)) : type;
    const withModifiers = WithModifiers(type, instantiatedType);
    return withModifiers;
  }
  function InstantiateType(context, state2, type) {
    const result = IsDeferred(type) ? InstantiateDeferred(context, state2, type.action, type.parameters, type.options) : InstantiateImmediate(context, state2, type);
    return result;
  }
  function Instantiate(context, type) {
    return InstantiateType(context, State([], []), type);
  }

  // runtime/node_modules/typebox/build/type/engine/immutable/instantiate_add.mjs
  function AddImmutableOperation(type) {
    return memory_exports.Update(type, { "~immutable": true }, {});
  }
  function AddImmutableAction(type, options) {
    const result = memory_exports.Update(AddImmutableOperation(type), {}, options);
    return result;
  }
  function AddImmutableInstantiate(context, state2, type, options) {
    const instantiatedType = InstantiateType(context, state2, type);
    return AddImmutableAction(instantiatedType, options);
  }

  // runtime/node_modules/typebox/build/type/action/_add_immutable.mjs
  function AddImmutableDeferred(type, options = {}) {
    return Deferred("AddImmutable", [type], options);
  }
  function AddImmutable(type, options = {}) {
    return AddImmutableAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/action/evaluate.mjs
  function EvaluateDeferred(type, options = {}) {
    return Deferred("Evaluate", [type], options);
  }
  function Evaluate2(type, options = {}) {
    return EvaluateAction(type, options);
  }

  // runtime/node_modules/typebox/build/type/action/module.mjs
  function ModuleDeferred(declarations, options = {}) {
    return Deferred("Module", [declarations], options);
  }
  function Module2(declarations, options = {}) {
    return ModuleInstantiate({}, State([], []), declarations, options);
  }

  // runtime/node_modules/typebox/build/type/engine/priority/priority.mjs
  function Comparer(left, right) {
    const compareResult = Compare(left, right);
    const result = guard_exports.IsEqual(compareResult, "right-inside") ? 1 : guard_exports.IsEqual(compareResult, "disjoint") ? 1 : 0;
    return result;
  }
  function Insert(type, types, result = []) {
    return guard_exports.ShiftLeft(types, (left, right) => guard_exports.IsEqual(Comparer(type, left), 1) ? Insert(type, right, [...result, left]) : [...result, type, ...types], () => [...result, type]);
  }
  function Sort(types, result = []) {
    return guard_exports.ShiftLeft(types, (left, right) => Sort(right, Insert(left, result)), () => result);
  }
  function Priority(types) {
    const result = Sort(types);
    return result;
  }

  // runtime/node_modules/typebox/build/type/script/script.mjs
  function Script2(...args) {
    const [context, input, options] = arguments_exports.Match(args, {
      2: (script, options2) => guard_exports.IsString(script) ? [{}, script, options2] : [script, options2, {}],
      3: (context2, script, options2) => [context2, script, options2],
      1: (script) => [{}, script, {}]
    });
    const result = Script(input);
    const parsed = guard_exports.IsArray(result) && guard_exports.IsEqual(result.length, 2) ? InstantiateType(context, State([], []), result[0]) : Never();
    return memory_exports.Update(parsed, {}, options);
  }

  // runtime/node_modules/typebox/build/typebox.mjs
  var typebox_exports = {};
  __export(typebox_exports, {
    Any: () => Any,
    Array: () => _Array_,
    BigInt: () => BigInt2,
    Boolean: () => Boolean2,
    Call: () => Call2,
    Capitalize: () => Capitalize,
    Codec: () => Codec,
    Conditional: () => Conditional,
    Constructor: () => Constructor,
    ConstructorParameters: () => ConstructorParameters,
    Cyclic: () => Cyclic,
    Decode: () => Decode,
    DecodeBuilder: () => DecodeBuilder,
    Dependent: () => Dependent,
    Encode: () => Encode,
    EncodeBuilder: () => EncodeBuilder,
    Enum: () => Enum,
    Evaluate: () => Evaluate2,
    Exclude: () => Exclude,
    Extends: () => Extends,
    ExtendsResult: () => result_exports,
    Extract: () => Extract,
    Function: () => _Function_,
    Generic: () => Generic,
    Identifier: () => Identifier,
    Immutable: () => Immutable,
    Index: () => Index,
    Infer: () => Infer,
    InstanceType: () => InstanceType,
    Instantiate: () => Instantiate,
    Integer: () => Integer,
    Interface: () => Interface,
    Intersect: () => Intersect,
    IsAny: () => IsAny,
    IsArray: () => IsArray3,
    IsBigInt: () => IsBigInt3,
    IsBoolean: () => IsBoolean4,
    IsCall: () => IsCall,
    IsCodec: () => IsCodec,
    IsConstructor: () => IsConstructor3,
    IsCyclic: () => IsCyclic,
    IsDependent: () => IsDependent,
    IsEnum: () => IsEnum,
    IsEnumValue: () => IsEnumValue,
    IsFunction: () => IsFunction3,
    IsGeneric: () => IsGeneric,
    IsIdentifier: () => IsIdentifier2,
    IsImmutable: () => IsImmutable,
    IsInfer: () => IsInfer,
    IsInteger: () => IsInteger3,
    IsIntersect: () => IsIntersect,
    IsKind: () => IsKind,
    IsLiteral: () => IsLiteral,
    IsNever: () => IsNever,
    IsNull: () => IsNull3,
    IsNumber: () => IsNumber4,
    IsObject: () => IsObject3,
    IsOptional: () => IsOptional,
    IsParameter: () => IsParameter,
    IsReadonly: () => IsReadonly,
    IsRecord: () => IsRecord,
    IsRef: () => IsRef,
    IsRefine: () => IsRefine,
    IsRest: () => IsRest,
    IsSchema: () => IsSchema,
    IsString: () => IsString4,
    IsSymbol: () => IsSymbol3,
    IsTemplateLiteral: () => IsTemplateLiteral,
    IsThis: () => IsThis,
    IsTuple: () => IsTuple,
    IsUndefined: () => IsUndefined3,
    IsUnion: () => IsUnion,
    IsUnknown: () => IsUnknown,
    IsUnsafe: () => IsUnsafe,
    IsVoid: () => IsVoid,
    KeyOf: () => KeyOf2,
    Literal: () => Literal,
    Lowercase: () => Lowercase,
    Mapped: () => Mapped,
    Module: () => Module2,
    Never: () => Never,
    NonNullable: () => NonNullable,
    Null: () => Null,
    Number: () => Number2,
    Object: () => _Object_,
    Omit: () => Omit,
    Optional: () => Optional,
    Parameter: () => Parameter,
    Parameters: () => Parameters,
    Partial: () => Partial,
    Pick: () => Pick,
    Readonly: () => Readonly,
    ReadonlyObject: () => ReadonlyObject,
    ReadonlyType: () => ReadonlyType,
    Record: () => Record,
    RecordKey: () => RecordKey,
    RecordPattern: () => RecordPattern,
    RecordValue: () => RecordValue,
    Ref: () => Ref,
    Refine: () => Refine,
    Required: () => Required,
    Rest: () => Rest,
    ReturnType: () => ReturnType,
    Script: () => Script2,
    String: () => String2,
    Symbol: () => Symbol2,
    TemplateLiteral: () => TemplateLiteral2,
    This: () => This,
    Tuple: () => Tuple,
    Uncapitalize: () => Uncapitalize,
    Undefined: () => Undefined,
    Union: () => Union,
    Unknown: () => Unknown,
    Unsafe: () => Unsafe,
    Uppercase: () => Uppercase,
    Void: () => Void,
    With: () => With2
  });

  // runtime/node_modules/@earendil-works/pi-ai/dist/utils/event-stream.js
  var EventStream = class {
    constructor(isComplete, extractResult) {
      __publicField(this, "queue", []);
      __publicField(this, "waiting", []);
      __publicField(this, "done", false);
      __publicField(this, "finalResultPromise");
      __publicField(this, "resolveFinalResult");
      __publicField(this, "isComplete");
      __publicField(this, "extractResult");
      this.isComplete = isComplete;
      this.extractResult = extractResult;
      this.finalResultPromise = new Promise((resolve) => {
        this.resolveFinalResult = resolve;
      });
    }
    push(event) {
      if (this.done)
        return;
      if (this.isComplete(event)) {
        this.done = true;
        this.resolveFinalResult(this.extractResult(event));
      }
      const waiter = this.waiting.shift();
      if (waiter) {
        waiter({ value: event, done: false });
      } else {
        this.queue.push(event);
      }
    }
    end(result) {
      this.done = true;
      if (result !== void 0) {
        this.resolveFinalResult(result);
      }
      while (this.waiting.length > 0) {
        const waiter = this.waiting.shift();
        waiter({ value: void 0, done: true });
      }
    }
    async *[Symbol.asyncIterator]() {
      while (true) {
        if (this.queue.length > 0) {
          yield this.queue.shift();
        } else if (this.done) {
          return;
        } else {
          const result = await new Promise((resolve) => this.waiting.push(resolve));
          if (result.done)
            return;
          yield result.value;
        }
      }
    }
    result() {
      return this.finalResultPromise;
    }
  };
  var AssistantMessageEventStream = class extends EventStream {
    constructor() {
      super((event) => event.type === "done" || event.type === "error", (event) => {
        if (event.type === "done") {
          return event.message;
        } else if (event.type === "error") {
          return event.error;
        }
        throw new Error("Unexpected event type for final result");
      });
    }
  };

  // runtime/node_modules/typebox/build/schema/types/_refine.mjs
  function IsRefine2(value) {
    return guard_exports.HasPropertyKey(value, "~refine") && guard_exports.IsArray(value["~refine"]) && guard_exports.Every(value["~refine"], 0, (value2) => guard_exports.IsObject(value2) && guard_exports.HasPropertyKey(value2, "check") && guard_exports.HasPropertyKey(value2, "error") && guard_exports.IsFunction(value2.check) && guard_exports.IsFunction(value2.error));
  }

  // runtime/node_modules/typebox/build/schema/types/schema.mjs
  function IsSchemaObject(value) {
    return guard_exports.IsObject(value) && !guard_exports.IsArray(value);
  }
  function IsSchemaBoolean(value) {
    return guard_exports.IsBoolean(value);
  }
  function IsSchema2(value) {
    return IsSchemaObject(value) || IsSchemaBoolean(value);
  }

  // runtime/node_modules/typebox/build/schema/types/additionalItems.mjs
  function IsAdditionalItems(schema) {
    return guard_exports.HasPropertyKey(schema, "additionalItems") && IsSchema2(schema.additionalItems);
  }

  // runtime/node_modules/typebox/build/schema/types/additionalProperties.mjs
  function IsAdditionalProperties(schema) {
    return guard_exports.HasPropertyKey(schema, "additionalProperties") && IsSchema2(schema.additionalProperties);
  }

  // runtime/node_modules/typebox/build/schema/types/allOf.mjs
  function IsAllOf(schema) {
    return guard_exports.HasPropertyKey(schema, "allOf") && guard_exports.IsArray(schema.allOf) && schema.allOf.every((value) => IsSchema2(value));
  }

  // runtime/node_modules/typebox/build/schema/types/anchor.mjs
  function IsAnchor(schema) {
    return guard_exports.HasPropertyKey(schema, "$anchor") && guard_exports.IsString(schema.$anchor);
  }

  // runtime/node_modules/typebox/build/schema/types/anyOf.mjs
  function IsAnyOf(schema) {
    return guard_exports.HasPropertyKey(schema, "anyOf") && guard_exports.IsArray(schema.anyOf) && schema.anyOf.every((value) => IsSchema2(value));
  }

  // runtime/node_modules/typebox/build/schema/types/const.mjs
  function IsConst(value) {
    return guard_exports.HasPropertyKey(value, "const");
  }

  // runtime/node_modules/typebox/build/schema/types/contains.mjs
  function IsContains(schema) {
    return guard_exports.HasPropertyKey(schema, "contains") && IsSchema2(schema.contains);
  }

  // runtime/node_modules/typebox/build/schema/types/default.mjs
  function IsDefault(schema) {
    return guard_exports.HasPropertyKey(schema, "default");
  }

  // runtime/node_modules/typebox/build/schema/types/dependencies.mjs
  function IsDependencies(schema) {
    return guard_exports.HasPropertyKey(schema, "dependencies") && guard_exports.IsObject(schema.dependencies) && Object.values(schema.dependencies).every((value) => IsSchema2(value) || guard_exports.IsArray(value) && value.every((value2) => guard_exports.IsString(value2)));
  }

  // runtime/node_modules/typebox/build/schema/types/dependentRequired.mjs
  function IsDependentRequired(schema) {
    return guard_exports.HasPropertyKey(schema, "dependentRequired") && guard_exports.IsObject(schema.dependentRequired) && Object.values(schema.dependentRequired).every((value) => guard_exports.IsArray(value) && value.every((value2) => guard_exports.IsString(value2)));
  }

  // runtime/node_modules/typebox/build/schema/types/dependentSchemas.mjs
  function IsDependentSchemas(schema) {
    return guard_exports.HasPropertyKey(schema, "dependentSchemas") && guard_exports.IsObject(schema.dependentSchemas) && Object.values(schema.dependentSchemas).every((value) => IsSchema2(value));
  }

  // runtime/node_modules/typebox/build/schema/types/dynamicAnchor.mjs
  function IsDynamicAnchor(schema) {
    return guard_exports.HasPropertyKey(schema, "$dynamicAnchor") && guard_exports.IsString(schema.$dynamicAnchor);
  }

  // runtime/node_modules/typebox/build/schema/types/dynamicRef.mjs
  function IsDynamicRef(schema) {
    return guard_exports.HasPropertyKey(schema, "$dynamicRef") && guard_exports.IsString(schema.$dynamicRef);
  }

  // runtime/node_modules/typebox/build/schema/types/else.mjs
  function IsElse(schema) {
    return guard_exports.HasPropertyKey(schema, "else") && IsSchema2(schema.else);
  }

  // runtime/node_modules/typebox/build/schema/types/enum.mjs
  function IsEnum2(schema) {
    return guard_exports.HasPropertyKey(schema, "enum") && guard_exports.IsArray(schema.enum);
  }

  // runtime/node_modules/typebox/build/schema/types/exclusiveMaximum.mjs
  function IsExclusiveMaximum(schema) {
    return guard_exports.HasPropertyKey(schema, "exclusiveMaximum") && (guard_exports.IsNumber(schema.exclusiveMaximum) || guard_exports.IsBigInt(schema.exclusiveMaximum));
  }

  // runtime/node_modules/typebox/build/schema/types/exclusiveMinimum.mjs
  function IsExclusiveMinimum(schema) {
    return guard_exports.HasPropertyKey(schema, "exclusiveMinimum") && (guard_exports.IsNumber(schema.exclusiveMinimum) || guard_exports.IsBigInt(schema.exclusiveMinimum));
  }

  // runtime/node_modules/typebox/build/schema/types/format.mjs
  function IsFormat(schema) {
    return guard_exports.HasPropertyKey(schema, "format") && guard_exports.IsString(schema.format);
  }

  // runtime/node_modules/typebox/build/schema/types/id.mjs
  function IsId(schema) {
    return guard_exports.HasPropertyKey(schema, "$id") && guard_exports.IsString(schema.$id);
  }

  // runtime/node_modules/typebox/build/schema/types/if.mjs
  function IsIf(schema) {
    return guard_exports.HasPropertyKey(schema, "if") && IsSchema2(schema.if);
  }

  // runtime/node_modules/typebox/build/schema/types/items.mjs
  function IsItems(schema) {
    return guard_exports.HasPropertyKey(schema, "items") && (IsSchema2(schema.items) || guard_exports.IsArray(schema.items) && schema.items.every((value) => {
      return IsSchema2(value);
    }));
  }
  function IsItemsSized(schema) {
    return IsItems(schema) && guard_exports.IsArray(schema.items);
  }

  // runtime/node_modules/typebox/build/schema/types/maximum.mjs
  function IsMaximum(schema) {
    return guard_exports.HasPropertyKey(schema, "maximum") && (guard_exports.IsNumber(schema.maximum) || guard_exports.IsBigInt(schema.maximum));
  }

  // runtime/node_modules/typebox/build/schema/types/maxContains.mjs
  function IsMaxContains(schema) {
    return guard_exports.HasPropertyKey(schema, "maxContains") && guard_exports.IsNumber(schema.maxContains);
  }

  // runtime/node_modules/typebox/build/schema/types/maxItems.mjs
  function IsMaxItems(schema) {
    return guard_exports.HasPropertyKey(schema, "maxItems") && guard_exports.IsNumber(schema.maxItems);
  }

  // runtime/node_modules/typebox/build/schema/types/maxLength.mjs
  function IsMaxLength4(schema) {
    return guard_exports.HasPropertyKey(schema, "maxLength") && guard_exports.IsNumber(schema.maxLength);
  }

  // runtime/node_modules/typebox/build/schema/types/maxProperties.mjs
  function IsMaxProperties(schema) {
    return guard_exports.HasPropertyKey(schema, "maxProperties") && guard_exports.IsNumber(schema.maxProperties);
  }

  // runtime/node_modules/typebox/build/schema/types/minimum.mjs
  function IsMinimum(schema) {
    return guard_exports.HasPropertyKey(schema, "minimum") && (guard_exports.IsNumber(schema.minimum) || guard_exports.IsBigInt(schema.minimum));
  }

  // runtime/node_modules/typebox/build/schema/types/minContains.mjs
  function IsMinContains(schema) {
    return guard_exports.HasPropertyKey(schema, "minContains") && guard_exports.IsNumber(schema.minContains);
  }

  // runtime/node_modules/typebox/build/schema/types/minItems.mjs
  function IsMinItems(schema) {
    return guard_exports.HasPropertyKey(schema, "minItems") && guard_exports.IsNumber(schema.minItems);
  }

  // runtime/node_modules/typebox/build/schema/types/minLength.mjs
  function IsMinLength4(schema) {
    return guard_exports.HasPropertyKey(schema, "minLength") && guard_exports.IsNumber(schema.minLength);
  }

  // runtime/node_modules/typebox/build/schema/types/minProperties.mjs
  function IsMinProperties(schema) {
    return guard_exports.HasPropertyKey(schema, "minProperties") && guard_exports.IsNumber(schema.minProperties);
  }

  // runtime/node_modules/typebox/build/schema/types/multipleOf.mjs
  function IsMultipleOf2(schema) {
    return guard_exports.HasPropertyKey(schema, "multipleOf") && (guard_exports.IsNumber(schema.multipleOf) || guard_exports.IsBigInt(schema.multipleOf));
  }

  // runtime/node_modules/typebox/build/schema/types/not.mjs
  function IsNot(schema) {
    return guard_exports.HasPropertyKey(schema, "not") && IsSchema2(schema.not);
  }

  // runtime/node_modules/typebox/build/schema/types/oneOf.mjs
  function IsOneOf(schema) {
    return guard_exports.HasPropertyKey(schema, "oneOf") && guard_exports.IsArray(schema.oneOf) && schema.oneOf.every((value) => IsSchema2(value));
  }

  // runtime/node_modules/typebox/build/schema/types/pattern.mjs
  function IsPattern(schema) {
    return guard_exports.HasPropertyKey(schema, "pattern") && (guard_exports.IsString(schema.pattern) || schema.pattern instanceof RegExp);
  }

  // runtime/node_modules/typebox/build/schema/types/patternProperties.mjs
  function IsPatternProperties(schema) {
    return guard_exports.HasPropertyKey(schema, "patternProperties") && guard_exports.IsObject(schema.patternProperties) && Object.values(schema.patternProperties).every((value) => IsSchema2(value));
  }

  // runtime/node_modules/typebox/build/schema/types/prefixItems.mjs
  function IsPrefixItems(schema) {
    return guard_exports.HasPropertyKey(schema, "prefixItems") && guard_exports.IsArray(schema.prefixItems) && schema.prefixItems.every((schema2) => IsSchema2(schema2));
  }

  // runtime/node_modules/typebox/build/schema/types/properties.mjs
  function IsProperties(schema) {
    return guard_exports.HasPropertyKey(schema, "properties") && guard_exports.IsObject(schema.properties) && Object.values(schema.properties).every((value) => IsSchema2(value));
  }

  // runtime/node_modules/typebox/build/schema/types/propertyNames.mjs
  function IsPropertyNames(schema) {
    return guard_exports.HasPropertyKey(schema, "propertyNames") && (guard_exports.IsObject(schema.propertyNames) || IsSchema2(schema.propertyNames));
  }

  // runtime/node_modules/typebox/build/schema/types/recursiveAnchor.mjs
  function IsRecursiveAnchor(schema) {
    return guard_exports.HasPropertyKey(schema, "$recursiveAnchor") && guard_exports.IsBoolean(schema.$recursiveAnchor);
  }
  function IsRecursiveAnchorTrue(schema) {
    return IsRecursiveAnchor(schema) && guard_exports.IsEqual(schema.$recursiveAnchor, true);
  }

  // runtime/node_modules/typebox/build/schema/types/recursiveRef.mjs
  function IsRecursiveRef(schema) {
    return guard_exports.HasPropertyKey(schema, "$recursiveRef") && guard_exports.IsString(schema.$recursiveRef);
  }

  // runtime/node_modules/typebox/build/schema/types/ref.mjs
  function IsRef2(schema) {
    return guard_exports.HasPropertyKey(schema, "$ref") && guard_exports.IsString(schema.$ref);
  }

  // runtime/node_modules/typebox/build/schema/types/required.mjs
  function IsRequired(schema) {
    return guard_exports.HasPropertyKey(schema, "required") && guard_exports.IsArray(schema.required) && schema.required.every((value) => guard_exports.IsString(value));
  }

  // runtime/node_modules/typebox/build/schema/types/then.mjs
  function IsThen(schema) {
    return guard_exports.HasPropertyKey(schema, "then") && IsSchema2(schema.then);
  }

  // runtime/node_modules/typebox/build/schema/types/type.mjs
  function IsType(schema) {
    return guard_exports.HasPropertyKey(schema, "type") && (guard_exports.IsString(schema.type) || guard_exports.IsArray(schema.type) && schema.type.every((value) => guard_exports.IsString(value)));
  }

  // runtime/node_modules/typebox/build/schema/types/uniqueItems.mjs
  function IsUniqueItems(schema) {
    return guard_exports.HasPropertyKey(schema, "uniqueItems") && guard_exports.IsBoolean(schema.uniqueItems);
  }

  // runtime/node_modules/typebox/build/schema/types/unevaluatedItems.mjs
  function IsUnevaluatedItems(schema) {
    return guard_exports.HasPropertyKey(schema, "unevaluatedItems") && IsSchema2(schema.unevaluatedItems);
  }

  // runtime/node_modules/typebox/build/schema/types/unevaluatedProperties.mjs
  function IsUnevaluatedProperties(schema) {
    return guard_exports.HasPropertyKey(schema, "unevaluatedProperties") && IsSchema2(schema.unevaluatedProperties);
  }

  // runtime/node_modules/typebox/build/schema/engine/_context.mjs
  function HasUnevaluatedFromObject(value) {
    return IsUnevaluatedItems(value) || IsUnevaluatedProperties(value) || guard_exports.Keys(value).some((key) => HasUnevaluatedFromUnknown(value[key]));
  }
  function HasUnevaluatedFromArray(value) {
    return value.some((value2) => HasUnevaluatedFromUnknown(value2));
  }
  function HasUnevaluatedFromUnknown(value) {
    return guard_exports.IsArray(value) ? HasUnevaluatedFromArray(value) : guard_exports.IsObject(value) ? HasUnevaluatedFromObject(value) : false;
  }
  function HasUnevaluated(context, schema) {
    return HasUnevaluatedFromUnknown(schema) || guard_exports.Keys(context).some((key) => HasUnevaluatedFromUnknown(context[key]));
  }
  var BuildContext = class {
    constructor(hasUnevaluated) {
      this.hasUnevaluated = hasUnevaluated;
    }
    UseUnevaluated() {
      return this.hasUnevaluated;
    }
    // ----------------------------------------------------------------
    // Stack
    // ----------------------------------------------------------------
    Push() {
      return emit_exports.Call(emit_exports.Member("context", "Push"), []);
    }
    Pop() {
      return emit_exports.Call(emit_exports.Member("context", "Pop"), []);
    }
    // ----------------------------------------------------------------
    // Top
    // ----------------------------------------------------------------
    AddIndex(index3) {
      return emit_exports.Call(emit_exports.Member("context", "AddIndex"), [index3]);
    }
    AddKey(key) {
      return emit_exports.Call(emit_exports.Member("context", "AddKey"), [key]);
    }
    Merge(results) {
      return emit_exports.Call(emit_exports.Member("context", "Merge"), [results]);
    }
  };
  var CheckContext = class {
    constructor() {
      const indices = /* @__PURE__ */ new Set();
      const keys = /* @__PURE__ */ new Set();
      this.stack = [{ indices, keys }];
    }
    // ----------------------------------------------------------------
    // Stack
    // ----------------------------------------------------------------
    Push() {
      const indices = /* @__PURE__ */ new Set();
      const keys = /* @__PURE__ */ new Set();
      this.stack.push({ indices, keys });
      return true;
    }
    Pop() {
      this.stack.pop();
      return true;
    }
    // ----------------------------------------------------------------
    // Top
    // ----------------------------------------------------------------
    AddIndex(index3) {
      this.GetIndices().add(index3);
      return true;
    }
    AddKey(key) {
      this.GetKeys().add(key);
      return true;
    }
    GetIndices() {
      const top = this.stack[this.stack.length - 1];
      return top.indices;
    }
    GetKeys() {
      const top = this.stack[this.stack.length - 1];
      return top.keys;
    }
    Merge(results) {
      for (const context of results) {
        context.GetIndices().forEach((value) => this.GetIndices().add(value));
        context.GetKeys().forEach((value) => this.GetKeys().add(value));
      }
      return true;
    }
  };
  var ErrorContext = class extends CheckContext {
    constructor(callback) {
      super();
      this.callback = callback;
    }
    AddError(error) {
      this.callback(error);
      return false;
    }
  };
  var AccumulatedErrorContext = class extends ErrorContext {
    constructor() {
      super((error) => this.errors.push(error));
      this.errors = [];
    }
    AddError(error) {
      this.errors.push(error);
      return false;
    }
    GetErrors() {
      return this.errors;
    }
  };

  // runtime/node_modules/typebox/build/schema/engine/_externals.mjs
  var state = {
    identifier: "External",
    variables: []
  };
  function CreateVariable(value) {
    const call2 = `External[${state.variables.length}]`;
    state.variables.push(value);
    return call2;
  }
  function ResetExternal() {
    state.variables = [];
  }
  function GetExternal() {
    return { ...state };
  }

  // runtime/node_modules/typebox/build/schema/engine/_refine.mjs
  function BuildRefine(_stack, _context, schema, value) {
    const refinements = CreateVariable(schema["~refine"].map((refinement) => refinement));
    return emit_exports.Every(refinements, emit_exports.Constant(0), ["refinement", "_"], emit_exports.Call(emit_exports.Member("refinement", "check"), [value]));
  }
  function CheckRefine(_stack, _context, schema, value) {
    return guard_exports.Every(schema["~refine"], 0, (refinement, _) => refinement.check(value));
  }
  function ErrorRefine(_stack, context, schemaPath, instancePath, schema, value) {
    return guard_exports.EveryAll(schema["~refine"], 0, (refinement, index3) => {
      return refinement.check(value) || context.AddError({
        keyword: "~refine",
        schemaPath,
        instancePath,
        params: { index: index3, message: refinement.error(value) }
      });
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/_unique.mjs
  var index = 0;
  function Unique() {
    return `var_${index++}`;
  }

  // runtime/node_modules/typebox/build/schema/engine/additionalItems.mjs
  function IsValid(schema) {
    return IsItems(schema) && guard_exports.IsArray(schema.items);
  }
  function BuildAdditionalItems(stack, context, schema, value) {
    if (!IsValid(schema))
      return emit_exports.Constant(true);
    const [item, index3] = [Unique(), Unique()];
    const isSchema = BuildSchemaPushStack(stack, context, schema.additionalItems, item);
    const isLength = emit_exports.IsLessThan(index3, emit_exports.Constant(schema.items.length));
    const addIndex = context.AddIndex(index3);
    const guarded = context.UseUnevaluated() ? emit_exports.Or(isLength, emit_exports.And(isSchema, addIndex)) : emit_exports.Or(isLength, isSchema);
    return emit_exports.Call(emit_exports.Member(value, "every"), [emit_exports.ArrowFunction([item, index3], guarded)]);
  }
  function CheckAdditionalItems(stack, context, schema, value) {
    if (!IsValid(schema))
      return true;
    const isAdditionalItems = value.every((item, index3) => {
      return guard_exports.IsLessThan(index3, schema.items.length) || CheckSchemaPushStack(stack, context, schema.additionalItems, item) && context.AddIndex(index3);
    });
    return isAdditionalItems;
  }
  function ErrorAdditionalItems(stack, context, schemaPath, instancePath, schema, value) {
    if (!IsValid(schema))
      return true;
    const isAdditionalItems = value.every((item, index3) => {
      const nextSchemaPath = `${schemaPath}/additionalItems`;
      const nextInstancePath = `${instancePath}/${index3}`;
      return guard_exports.IsLessThan(index3, schema.items.length) || ErrorSchemaPushStack(stack, context, nextSchemaPath, nextInstancePath, schema.additionalItems, item) && context.AddIndex(index3);
    });
    return isAdditionalItems;
  }

  // runtime/node_modules/typebox/build/schema/engine/additionalProperties.mjs
  function GetPropertyKeyAsPattern(key) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return `^${escaped}$`;
  }
  function GetPropertiesPattern(schema) {
    const patterns = [];
    if (IsPatternProperties(schema))
      patterns.push(...guard_exports.Keys(schema.patternProperties));
    if (IsProperties(schema))
      patterns.push(...guard_exports.Keys(schema.properties).map(GetPropertyKeyAsPattern));
    return guard_exports.IsEqual(patterns.length, 0) ? "(?!)" : `(${patterns.join("|")})`;
  }
  function CanAdditionalPropertiesFast(_context, schema, _value) {
    return IsRequired(schema) && IsProperties(schema) && !IsPatternProperties(schema) && guard_exports.IsEqual(schema.additionalProperties, false) && guard_exports.IsEqual(guard_exports.Keys(schema.properties).length, schema.required.length);
  }
  function BuildAdditionalPropertiesFast(_context, schema, value) {
    return emit_exports.IsEqual(emit_exports.Member(emit_exports.Call(emit_exports.Member("Object", "getOwnPropertyNames"), [value]), "length"), emit_exports.Constant(schema.required.length));
  }
  function BuildAdditionalPropertiesStandard(stack, context, schema, value) {
    const [key, _index] = [Unique(), Unique()];
    const regexp = CreateVariable(new RegExp(GetPropertiesPattern(schema)));
    const isSchema = BuildSchemaPushStack(stack, context, schema.additionalProperties, `${value}[${key}]`);
    const isKey = emit_exports.Call(emit_exports.Member(regexp, "test"), [key]);
    const addKey = context.AddKey(key);
    const guarded = context.UseUnevaluated() ? emit_exports.Or(isKey, emit_exports.And(isSchema, addKey)) : emit_exports.Or(isKey, isSchema);
    const result = emit_exports.Every(emit_exports.Keys(value), emit_exports.Constant(0), [key, _index], guarded);
    return result;
  }
  function BuildAdditionalProperties(stack, context, schema, value) {
    return CanAdditionalPropertiesFast(context, schema, value) ? BuildAdditionalPropertiesFast(context, schema, value) : BuildAdditionalPropertiesStandard(stack, context, schema, value);
  }
  function CheckAdditionalProperties(stack, context, schema, value) {
    const regexp = new RegExp(GetPropertiesPattern(schema));
    const isAdditionalProperties = guard_exports.Every(guard_exports.Keys(value), 0, (key, _index) => {
      return regexp.test(key) || CheckSchemaPushStack(stack, context, schema.additionalProperties, value[key]) && context.AddKey(key);
    });
    return isAdditionalProperties;
  }
  function ErrorAdditionalProperties(stack, context, schemaPath, instancePath, schema, value) {
    const regexp = new RegExp(GetPropertiesPattern(schema));
    const additionalProperties = [];
    const isAdditionalProperties = guard_exports.EveryAll(guard_exports.Keys(value), 0, (key, _index) => {
      const nextSchemaPath = `${schemaPath}/additionalProperties`;
      const nextInstancePath = `${instancePath}/${key}`;
      const nextContext = new AccumulatedErrorContext();
      const isAdditionalProperty = regexp.test(key) || ErrorSchemaPushStack(stack, nextContext, nextSchemaPath, nextInstancePath, schema.additionalProperties, value[key]) && context.AddKey(key);
      if (!isAdditionalProperty)
        additionalProperties.push(key);
      return isAdditionalProperty;
    });
    return isAdditionalProperties || context.AddError({
      keyword: "additionalProperties",
      schemaPath,
      instancePath,
      params: { additionalProperties }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/_reducer.mjs
  function Reducer(stack, context, schemas2, value, check) {
    const results = emit_exports.ConstDeclaration("results", "[]");
    const context_n = schemas2.map((_schema, index3) => emit_exports.ConstDeclaration(`context_${index3}`, emit_exports.New("CheckContext", [])));
    const condition_n = schemas2.map((schema, index3) => emit_exports.ConstDeclaration(`condition_${index3}`, emit_exports.Call(emit_exports.ArrowFunction(["context"], BuildSchema(stack, context, schema, value)), [`context_${index3}`])));
    const checks = schemas2.map((_schema, index3) => emit_exports.If(`condition_${index3}`, emit_exports.Call(emit_exports.Member("results", "push"), [`context_${index3}`])));
    const returns = emit_exports.Return(emit_exports.And(check, context.Merge("results")));
    return emit_exports.Call(emit_exports.ArrowFunction([], emit_exports.Statements([results, ...context_n, ...condition_n, ...checks, returns])), []);
  }

  // runtime/node_modules/typebox/build/schema/engine/allOf.mjs
  function BuildAllOfStandard(stack, context, schema, value) {
    return Reducer(stack, context, schema.allOf, value, emit_exports.IsEqual(emit_exports.Member("results", "length"), emit_exports.Constant(schema.allOf.length)));
  }
  function BuildAllOfFast(stack, context, schema, value) {
    return emit_exports.ReduceAnd(schema.allOf.map((schema2) => BuildSchema(stack, context, schema2, value)));
  }
  function BuildAllOf(stack, context, schema, value) {
    return context.UseUnevaluated() ? BuildAllOfStandard(stack, context, schema, value) : BuildAllOfFast(stack, context, schema, value);
  }
  function CheckAllOf(stack, context, schema, value) {
    const results = schema.allOf.reduce((result, schema2) => {
      const nextContext = new CheckContext();
      return CheckSchema(stack, nextContext, schema2, value) ? [...result, nextContext] : result;
    }, []);
    return guard_exports.IsEqual(results.length, schema.allOf.length) && context.Merge(results);
  }
  function ErrorAllOf(stack, context, schemaPath, instancePath, schema, value) {
    const failedContexts = [];
    const results = schema.allOf.reduce((result, schema2, index3) => {
      const nextSchemaPath = `${schemaPath}/allOf/${index3}`;
      const nextContext = new AccumulatedErrorContext();
      const isSchema = ErrorSchema(stack, nextContext, nextSchemaPath, instancePath, schema2, value);
      if (!isSchema)
        failedContexts.push(nextContext);
      return isSchema ? [...result, nextContext] : result;
    }, []);
    const isAllOf = guard_exports.IsEqual(results.length, schema.allOf.length) && context.Merge(results);
    if (!isAllOf)
      failedContexts.forEach((failed) => failed.GetErrors().forEach((error) => context.AddError(error)));
    return isAllOf;
  }

  // runtime/node_modules/typebox/build/schema/engine/anyOf.mjs
  function BuildAnyOfStandard(stack, context, schema, value) {
    return Reducer(stack, context, schema.anyOf, value, emit_exports.IsGreaterThan(emit_exports.Member("results", "length"), emit_exports.Constant(0)));
  }
  function BuildAnyOfFast(stack, context, schema, value) {
    return emit_exports.ReduceOr(schema.anyOf.map((schema2) => BuildSchema(stack, context, schema2, value)));
  }
  function BuildAnyOf(stack, context, schema, value) {
    return context.UseUnevaluated() ? BuildAnyOfStandard(stack, context, schema, value) : BuildAnyOfFast(stack, context, schema, value);
  }
  function CheckAnyOf(stack, context, schema, value) {
    const results = schema.anyOf.reduce((result, schema2) => {
      const nextContext = new CheckContext();
      return CheckSchema(stack, nextContext, schema2, value) ? [...result, nextContext] : result;
    }, []);
    return guard_exports.IsGreaterThan(results.length, 0) && context.Merge(results);
  }
  function ErrorAnyOf(stack, context, schemaPath, instancePath, schema, value) {
    const failedContexts = [];
    const results = schema.anyOf.reduce((result, schema2, index3) => {
      const nextContext = new AccumulatedErrorContext();
      const nextSchemaPath = `${schemaPath}/anyOf/${index3}`;
      const isSchema = ErrorSchema(stack, nextContext, nextSchemaPath, instancePath, schema2, value);
      if (!isSchema)
        failedContexts.push(nextContext);
      return isSchema ? [...result, nextContext] : result;
    }, []);
    const isAnyOf = guard_exports.IsGreaterThan(results.length, 0) && context.Merge(results);
    if (!isAnyOf)
      failedContexts.forEach((failed) => failed.GetErrors().forEach((error) => context.AddError(error)));
    return isAnyOf || context.AddError({
      keyword: "anyOf",
      schemaPath,
      instancePath,
      params: {}
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/boolean.mjs
  function BuildSchemaBoolean(_stack, _context, schema, _value) {
    return schema ? emit_exports.Constant(true) : emit_exports.Constant(false);
  }
  function CheckSchemaBoolean(_stack, _context, schema, _value) {
    return schema;
  }
  function ErrorSchemaBoolean(stack, context, schemaPath, instancePath, schema, value) {
    return CheckSchemaBoolean(stack, context, schema, value) || context.AddError({
      keyword: "boolean",
      schemaPath,
      instancePath,
      params: {}
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/const.mjs
  function BuildConst(_stack, _context, schema, value) {
    return guard_exports.IsValueLike(schema.const) ? emit_exports.IsEqual(value, emit_exports.Constant(schema.const)) : emit_exports.IsDeepEqual(value, CreateVariable(schema.const));
  }
  function CheckConst(_stack, _context, schema, value) {
    return guard_exports.IsValueLike(schema.const) ? guard_exports.IsEqual(value, schema.const) : guard_exports.IsDeepEqual(value, schema.const);
  }
  function ErrorConst(stack, context, schemaPath, instancePath, schema, value) {
    return CheckConst(stack, context, schema, value) || context.AddError({
      keyword: "const",
      schemaPath,
      instancePath,
      params: { allowedValue: schema.const }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/contains.mjs
  function IsValid2(schema) {
    return !(IsMinContains(schema) && guard_exports.IsEqual(schema.minContains, 0));
  }
  function BuildContains(stack, context, schema, value) {
    if (!IsValid2(schema))
      return emit_exports.Constant(true);
    const item = Unique();
    const isLength = emit_exports.Not(emit_exports.IsEqual(emit_exports.Member(value, "length"), emit_exports.Constant(0)));
    const isSome = emit_exports.Call(emit_exports.Member(value, "some"), [emit_exports.ArrowFunction([item], BuildSchema(stack, context, schema.contains, item))]);
    return emit_exports.And(isLength, isSome);
  }
  function CheckContains(stack, context, schema, value) {
    if (!IsValid2(schema))
      return true;
    return !guard_exports.IsEqual(value.length, 0) && value.some((item) => CheckSchema(stack, context, schema.contains, item));
  }
  function ErrorContains(stack, context, schemaPath, instancePath, schema, value) {
    return CheckContains(stack, context, schema, value) || context.AddError({
      keyword: "contains",
      schemaPath,
      instancePath,
      params: { minContains: 1 }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/dependencies.mjs
  function BuildDependencies(stack, context, schema, value) {
    const isLength = emit_exports.IsEqual(emit_exports.Member(emit_exports.Keys(value), "length"), emit_exports.Constant(0));
    const isEveryDependency = emit_exports.ReduceAnd(guard_exports.Entries(schema.dependencies).map(([key, schema2]) => {
      const notKey = emit_exports.Not(emit_exports.HasPropertyKey(value, emit_exports.Constant(key)));
      const isSchema = BuildSchema(stack, context, schema2, value);
      const isEveryKey = (schema3) => emit_exports.ReduceAnd(schema3.map((key2) => emit_exports.HasPropertyKey(value, emit_exports.Constant(key2))));
      return emit_exports.Or(notKey, guard_exports.IsArray(schema2) ? isEveryKey(schema2) : isSchema);
    }));
    return emit_exports.Or(isLength, isEveryDependency);
  }
  function CheckDependencies(stack, context, schema, value) {
    const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
    const isEvery = guard_exports.Every(guard_exports.Entries(schema.dependencies), 0, ([key, schema2]) => {
      return !guard_exports.HasPropertyKey(value, key) || (guard_exports.IsArray(schema2) ? schema2.every((key2) => guard_exports.HasPropertyKey(value, key2)) : CheckSchema(stack, context, schema2, value));
    });
    return isLength || isEvery;
  }
  function ErrorDependencies(stack, context, schemaPath, instancePath, schema, value) {
    const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
    const isEvery = guard_exports.EveryAll(guard_exports.Entries(schema.dependencies), 0, ([key, schema2]) => {
      const nextSchemaPath = `${schemaPath}/dependencies/${key}`;
      return !guard_exports.HasPropertyKey(value, key) || (guard_exports.IsArray(schema2) ? schema2.every((dependency) => guard_exports.HasPropertyKey(value, dependency) || context.AddError({
        keyword: "dependencies",
        schemaPath,
        instancePath,
        params: { property: key, dependencies: schema2 }
      })) : ErrorSchema(stack, context, nextSchemaPath, instancePath, schema2, value));
    });
    return isLength || isEvery;
  }

  // runtime/node_modules/typebox/build/schema/engine/dependentRequired.mjs
  function BuildDependentRequired(_stack, _context, schema, value) {
    const isLength = emit_exports.IsEqual(emit_exports.Member(emit_exports.Keys(value), "length"), emit_exports.Constant(0));
    const isEvery = emit_exports.ReduceAnd(guard_exports.Entries(schema.dependentRequired).map(([key, keys]) => {
      const notKey = emit_exports.Not(emit_exports.HasPropertyKey(value, emit_exports.Constant(key)));
      const everyKey = emit_exports.ReduceAnd(keys.map((key2) => emit_exports.HasPropertyKey(value, emit_exports.Constant(key2))));
      return emit_exports.Or(notKey, everyKey);
    }));
    return emit_exports.Or(isLength, isEvery);
  }
  function CheckDependentRequired(_stack, _context, schema, value) {
    const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
    const isEvery = guard_exports.Every(guard_exports.Entries(schema.dependentRequired), 0, ([key, keys]) => {
      return !guard_exports.HasPropertyKey(value, key) || keys.every((key2) => guard_exports.HasPropertyKey(value, key2));
    });
    return isLength || isEvery;
  }
  function ErrorDependentRequired(_stack, context, schemaPath, instancePath, schema, value) {
    const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
    const isEveryEntry = guard_exports.EveryAll(guard_exports.Entries(schema.dependentRequired), 0, ([key, keys]) => {
      return !guard_exports.HasPropertyKey(value, key) || guard_exports.EveryAll(keys, 0, (dependency) => guard_exports.HasPropertyKey(value, dependency) || context.AddError({
        keyword: "dependentRequired",
        schemaPath,
        instancePath,
        params: { property: key, dependencies: keys }
      }));
    });
    return isLength || isEveryEntry;
  }

  // runtime/node_modules/typebox/build/schema/engine/dependentSchemas.mjs
  function BuildDependentSchemas(stack, context, schema, value) {
    const isLength = emit_exports.IsEqual(emit_exports.Member(emit_exports.Keys(value), "length"), emit_exports.Constant(0));
    const isEvery = emit_exports.ReduceAnd(guard_exports.Entries(schema.dependentSchemas).map(([key, schema2]) => {
      const notKey = emit_exports.Not(emit_exports.HasPropertyKey(value, emit_exports.Constant(key)));
      const isSchema = BuildSchema(stack, context, schema2, value);
      return emit_exports.Or(notKey, isSchema);
    }));
    return emit_exports.Or(isLength, isEvery);
  }
  function CheckDependentSchemas(stack, context, schema, value) {
    const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
    const isEvery = guard_exports.Every(guard_exports.Entries(schema.dependentSchemas), 0, ([key, schema2]) => {
      return !guard_exports.HasPropertyKey(value, key) || CheckSchema(stack, context, schema2, value);
    });
    return isLength || isEvery;
  }
  function ErrorDependentSchemas(stack, context, schemaPath, instancePath, schema, value) {
    const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
    const isEvery = guard_exports.EveryAll(guard_exports.Entries(schema.dependentSchemas), 0, ([key, schema2]) => {
      const nextSchemaPath = `${schemaPath}/dependentSchemas/${key}`;
      return !guard_exports.HasPropertyKey(value, key) || ErrorSchema(stack, context, nextSchemaPath, instancePath, schema2, value);
    });
    return isLength || isEvery;
  }

  // runtime/node_modules/typebox/build/schema/engine/dynamicRef.mjs
  function BuildDynamicRef(stack, context, schema, value) {
    const target = stack.DynamicRef(schema) ?? false;
    return CreateFunction(stack, context, target, value);
  }
  function CheckDynamicRef(stack, context, schema, value) {
    const target = stack.DynamicRef(schema) ?? false;
    return IsSchema2(target) && CheckSchema(stack, context, target, value);
  }
  function ErrorDynamicRef(stack, context, _schemaPath, instancePath, schema, value) {
    const target = stack.DynamicRef(schema) ?? false;
    return IsSchema2(target) && ErrorSchema(stack, context, "#", instancePath, target, value);
  }

  // runtime/node_modules/typebox/build/schema/engine/enum.mjs
  function BuildEnum(_stack, _context, schema, value) {
    return emit_exports.ReduceOr(schema.enum.map((option) => {
      if (guard_exports.IsValueLike(option))
        return emit_exports.IsEqual(value, emit_exports.Constant(option));
      const variable = CreateVariable(option);
      return emit_exports.IsDeepEqual(value, variable);
    }));
  }
  function CheckEnum(_stack, _context, schema, value) {
    return schema.enum.some((option) => guard_exports.IsValueLike(option) ? guard_exports.IsEqual(value, option) : guard_exports.IsDeepEqual(value, option));
  }
  function ErrorEnum(stack, context, schemaPath, instancePath, schema, value) {
    return CheckEnum(stack, context, schema, value) || context.AddError({
      keyword: "enum",
      schemaPath,
      instancePath,
      params: { allowedValues: schema.enum }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/exclusiveMaximum.mjs
  function BuildExclusiveMaximum(_stack, _context, schema, value) {
    return emit_exports.IsLessThan(value, emit_exports.Constant(schema.exclusiveMaximum));
  }
  function CheckExclusiveMaximum(_stack, _context, schema, value) {
    return guard_exports.IsLessThan(value, schema.exclusiveMaximum);
  }
  function ErrorExclusiveMaximum(stack, context, schemaPath, instancePath, schema, value) {
    return CheckExclusiveMaximum(stack, context, schema, value) || context.AddError({
      keyword: "exclusiveMaximum",
      schemaPath,
      instancePath,
      params: { comparison: "<", limit: schema.exclusiveMaximum }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/exclusiveMinimum.mjs
  function BuildExclusiveMinimum(_stack, _context, schema, value) {
    return emit_exports.IsGreaterThan(value, emit_exports.Constant(schema.exclusiveMinimum));
  }
  function CheckExclusiveMinimum(_stack, _context, schema, value) {
    return guard_exports.IsGreaterThan(value, schema.exclusiveMinimum);
  }
  function ErrorExclusiveMinimum(stack, context, schemaPath, instancePath, schema, value) {
    return CheckExclusiveMinimum(stack, context, schema, value) || context.AddError({
      keyword: "exclusiveMinimum",
      schemaPath,
      instancePath,
      params: { comparison: ">", limit: schema.exclusiveMinimum }
    });
  }

  // runtime/node_modules/typebox/build/format/format.mjs
  var format_exports = {};
  __export(format_exports, {
    Clear: () => Clear,
    Entries: () => Entries3,
    Get: () => Get3,
    Has: () => Has,
    IsDate: () => IsDate2,
    IsDateTime: () => IsDateTime,
    IsDuration: () => IsDuration,
    IsEmail: () => IsEmail,
    IsHostname: () => IsHostname,
    IsIPv4: () => IsIPv4,
    IsIPv6: () => IsIPv6,
    IsIdnEmail: () => IsIdnEmail,
    IsIdnHostname: () => IsIdnHostname,
    IsIri: () => IsIri,
    IsIriReference: () => IsIriReference,
    IsJsonPointer: () => IsJsonPointer,
    IsJsonPointerUriFragment: () => IsJsonPointerUriFragment,
    IsRegex: () => IsRegex,
    IsRelativeJsonPointer: () => IsRelativeJsonPointer,
    IsTime: () => IsTime,
    IsUri: () => IsUri,
    IsUriReference: () => IsUriReference,
    IsUriTemplate: () => IsUriTemplate,
    IsUrl: () => IsUrl,
    IsUuid: () => IsUuid,
    Reset: () => Reset2,
    Set: () => Set3,
    Test: () => Test
  });

  // runtime/node_modules/typebox/build/format/date.mjs
  var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
  function IsLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
  function IsDate2(value) {
    const matches = DATE.exec(value);
    if (!matches)
      return false;
    const year = +matches[1];
    const month = +matches[2];
    const day = +matches[3];
    return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && IsLeapYear(year) ? 29 : DAYS[month]);
  }

  // runtime/node_modules/typebox/build/format/time.mjs
  var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(?:Z|([+-])(\d\d):(\d\d))?$/i;
  function IsTime(value, strictTimeZone = true) {
    const matches = TIME.exec(value);
    if (!matches)
      return false;
    const hr = +matches[1];
    const min = +matches[2];
    const sec = +matches[3];
    const tzSign = matches[4] === "-" ? -1 : 1;
    const tzH = +(matches[5] || 0);
    const tzM = +(matches[6] || 0);
    if (tzH > 23 || tzM > 59)
      return false;
    if (strictTimeZone && !matches[4] && value.toLowerCase().indexOf("z") === -1) {
      return false;
    }
    if (hr <= 23 && min <= 59 && sec < 60)
      return true;
    const utcMin = min - tzM * tzSign;
    const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
    return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
  }

  // runtime/node_modules/typebox/build/format/date_time.mjs
  function IsDateTime(value, strictTimeZone = true) {
    const dateTime = value.split(/T/i);
    return dateTime.length === 2 && IsDate2(dateTime[0]) && IsTime(dateTime[1], strictTimeZone);
  }

  // runtime/node_modules/typebox/build/format/duration.mjs
  var Duration = /^P((\d+Y(\d+M(\d+D)?)?|\d+M(\d+D)?|\d+D)(T(\d+H(\d+M(\d+S)?)?|\d+M(\d+S)?|\d+S))?|T(\d+H(\d+M(\d+S)?)?|\d+M(\d+S)?|\d+S)|\d+W)$/;
  function IsDuration(value) {
    return Duration.test(value);
  }

  // runtime/node_modules/typebox/build/format/email.mjs
  var Email = /^(?!.*\.\.)[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
  function IsEmail(value) {
    return Email.test(value);
  }

  // runtime/node_modules/typebox/build/format/_puny.mjs
  var PUNYCODE_BASE = 36;
  var PUNYCODE_TMIN = 1;
  var PUNYCODE_TMAX = 26;
  var PUNYCODE_SKEW = 38;
  var PUNYCODE_DAMP = 700;
  var PUNYCODE_INITIAL_BIAS = 72;
  var PUNYCODE_INITIAL_N = 128;
  function Adapt(delta, numPoints, firstTime) {
    delta = firstTime ? Math.floor(delta / PUNYCODE_DAMP) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    let k = 0;
    while (delta > (PUNYCODE_BASE - PUNYCODE_TMIN) * PUNYCODE_TMAX >> 1) {
      delta = Math.floor(delta / (PUNYCODE_BASE - PUNYCODE_TMIN));
      k += PUNYCODE_BASE;
    }
    return k + Math.floor((PUNYCODE_BASE - PUNYCODE_TMIN + 1) * delta / (delta + PUNYCODE_SKEW));
  }
  function Decode2(value) {
    const output = [];
    let n = PUNYCODE_INITIAL_N;
    let i = 0;
    let bias = PUNYCODE_INITIAL_BIAS;
    const delimIdx = value.lastIndexOf("-");
    if (delimIdx > 0) {
      for (let j = 0; j < delimIdx; j++) {
        const cp = value.charCodeAt(j);
        if (cp >= 128)
          throw new Error("Invalid punycode: non-basic before delimiter");
        output.push(cp);
      }
    }
    let inIdx = delimIdx < 0 ? 0 : delimIdx + 1;
    while (inIdx < value.length) {
      const oldi = i;
      let w = 1;
      let k = PUNYCODE_BASE;
      while (true) {
        if (inIdx >= value.length)
          throw new Error("Invalid punycode: unexpected end of input");
        const ch = value.charCodeAt(inIdx++);
        let digit;
        if (ch >= 97 && ch <= 122)
          digit = ch - 97;
        else if (ch >= 48 && ch <= 57)
          digit = ch - 48 + 26;
        else if (ch >= 65 && ch <= 90)
          Unreachable();
        else
          throw new Error("Invalid punycode: bad digit character");
        i += digit * w;
        const t = k <= bias ? PUNYCODE_TMIN : k >= bias + PUNYCODE_TMAX ? PUNYCODE_TMAX : k - bias;
        if (digit < t)
          break;
        w *= PUNYCODE_BASE - t;
        k += PUNYCODE_BASE;
      }
      const outLen = output.length + 1;
      bias = Adapt(i - oldi, outLen, oldi === 0);
      n += Math.floor(i / outLen);
      i %= outLen;
      output.splice(i, 0, n);
      i++;
    }
    return globalThis.String.fromCodePoint(...output);
  }

  // runtime/node_modules/typebox/build/format/_idna.mjs
  function IsNonspacingMark(cp) {
    return /\p{Mn}/u.test(String.fromCodePoint(cp));
  }
  function IsSpacingCombiningMark(cp) {
    return /\p{Mc}/u.test(String.fromCodePoint(cp));
  }
  function IsEnclosingMark(cp) {
    return /\p{Me}/u.test(String.fromCodePoint(cp));
  }
  function IsCombiningMark2(cp) {
    return IsNonspacingMark(cp) || IsSpacingCombiningMark(cp) || IsEnclosingMark(cp);
  }
  var RFC5892_DISALLOWED = /* @__PURE__ */ new Set([
    1600,
    // ARABIC TATWEEL
    2042,
    // NKO LAJANYALAN
    12334,
    // HANGUL SINGLE DOT TONE MARK
    12335,
    // HANGUL DOUBLE DOT TONE MARK
    12337,
    // VERTICAL KANA REPEAT MARK
    12338,
    // VERTICAL KANA REPEAT WITH VOICED ITERATION MARK
    12339,
    // VERTICAL KANA REPEAT MARK UPPER HALF
    12340,
    // VERTICAL KANA REPEAT WITH VOICED ITERATION MARK UPPER HALF
    12341,
    // VERTICAL KANA REPEAT MARK LOWER HALF
    12347
    // VERTICAL IDEOGRAPHIC ITERATION MARK
  ]);
  var VIRAMA_CPS = /* @__PURE__ */ new Set([
    2381,
    2509,
    2637,
    2765,
    2893,
    3021,
    3149,
    3277,
    3387,
    3388,
    3405,
    3530,
    6980,
    7082,
    7083,
    43456,
    69702,
    69759,
    69817,
    69939,
    69940,
    70080,
    70197,
    70477,
    70722,
    70850,
    71103,
    71231,
    71350,
    72767,
    73028,
    73029
  ]);
  function IsGreek(cp) {
    return /\p{Script=Greek}/u.test(String.fromCodePoint(cp));
  }
  function IsHebrew(cp) {
    return /\p{Script=Hebrew}/u.test(String.fromCodePoint(cp));
  }
  function IsHiragana(cp) {
    return /\p{Script=Hiragana}/u.test(String.fromCodePoint(cp));
  }
  function IsKatakana(cp) {
    return /\p{Script=Katakana}/u.test(String.fromCodePoint(cp));
  }
  function IsHan(cp) {
    return /\p{Script=Han}/u.test(String.fromCodePoint(cp));
  }
  function IsArabicIndicDigit(cp) {
    return cp >= 1632 && cp <= 1641;
  }
  function IsExtendedArabicIndicDigit(cp) {
    return cp >= 1776 && cp <= 1785;
  }
  function IsVirama(cp) {
    return VIRAMA_CPS.has(cp);
  }
  function IsUnicodeLabel(value) {
    if (value.length === 0)
      return Unreachable();
    const cps = [...value].map((c) => c.codePointAt(0));
    const len = cps.length;
    if (cps[0] === 45 || cps[len - 1] === 45)
      return false;
    if (len >= 4 && cps[2] === 45 && cps[3] === 45)
      return false;
    if (IsCombiningMark2(cps[0]))
      return false;
    let hasJapanese = false;
    let hasArabicIndic = false;
    let hasExtendedArabicIndic = false;
    for (let i = 0; i < len; i++) {
      const cp = cps[i];
      if (RFC5892_DISALLOWED.has(cp))
        return false;
      if (IsHiragana(cp) || IsKatakana(cp) || IsHan(cp))
        hasJapanese = true;
      if (IsArabicIndicDigit(cp))
        hasArabicIndic = true;
      if (IsExtendedArabicIndicDigit(cp))
        hasExtendedArabicIndic = true;
      const prev = cps[i - 1], next = cps[i + 1];
      switch (cp) {
        case 183:
          if (prev !== 108 || next !== 108)
            return false;
          break;
        // MIDDLE DOT (Catalan)
        case 885:
          if (next === void 0 || !IsGreek(next))
            return false;
          break;
        // Greek KERAIA
        case 1523:
        case 1524:
          if (prev === void 0 || !IsHebrew(prev))
            return false;
          break;
        // Hebrew GERESH
        case 8204:
          if (prev === void 0 || prev < 128 && !IsVirama(prev))
            return false;
          break;
        case 8205:
          if (prev === void 0 || !IsVirama(prev))
            return false;
          break;
        case 12539:
          break;
      }
    }
    if (value.includes("\u30FB") && !hasJapanese)
      return false;
    if (hasArabicIndic && hasExtendedArabicIndic)
      return false;
    return true;
  }
  function IsAsciiLabel(value) {
    if (value.charCodeAt(0) === 45 || value.charCodeAt(value.length - 1) === 45)
      return false;
    if (value.length >= 4 && value.charCodeAt(2) === 45 && value.charCodeAt(3) === 45)
      return false;
    for (let i = 0; i < value.length; i++) {
      const ch = value.charCodeAt(i);
      if (!(ch >= 97 && ch <= 122 || // a-z
      ch >= 65 && ch <= 90 || // A-Z
      ch >= 48 && ch <= 57 || // 0-9
      ch === 45))
        return false;
    }
    return true;
  }
  function IsPuny(value) {
    return value.toLowerCase().startsWith("xn--");
  }
  function IsPunyLabel(value) {
    try {
      const payload = value.slice(4).toLowerCase();
      const lastHyphen = payload.lastIndexOf("-");
      if (lastHyphen === 0) {
        return false;
      }
      const decoded = Decode2(payload);
      if (!decoded)
        return false;
      return IsUnicodeLabel(decoded);
    } catch {
      return false;
    }
  }
  function IsIdnLabel(value) {
    if (value.length === 0 || value.length > 63)
      return false;
    return IsPuny(value) ? IsPunyLabel(value) : IsUnicodeLabel(value);
  }
  function IsLabel(value) {
    if (value.length === 0 || value.length > 63)
      return false;
    return IsPuny(value) ? IsPunyLabel(value) : IsAsciiLabel(value);
  }

  // runtime/node_modules/typebox/build/format/hostname.mjs
  function IsHostname(value) {
    if (value.length === 0 || value.length > 253)
      return false;
    if (value.charCodeAt(value.length - 1) === 46)
      return false;
    for (const label of value.split(".")) {
      if (!IsLabel(label))
        return false;
    }
    return true;
  }

  // runtime/node_modules/typebox/build/format/idn_email.mjs
  var IdnEmail = /^(?!.*\.\.)[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+(?:\.[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+)*@[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?)*$/iu;
  function IsIdnEmail(value) {
    return IdnEmail.test(value);
  }

  // runtime/node_modules/typebox/build/format/idn_hostname.mjs
  function IsIdnHostname(value) {
    if (value.length === 0 || value.includes(" "))
      return false;
    const canonical = value.normalize("NFC").replace(/[\u002E\u3002\uFF0E\uFF61]/g, ".");
    if (canonical.length > 253)
      return false;
    for (const label of canonical.split(".")) {
      if (!IsIdnLabel(label))
        return false;
    }
    return true;
  }

  // runtime/node_modules/typebox/build/format/ipv4.mjs
  function IsIPv4Internal(value, start, end) {
    let dots = 0;
    let num = 0;
    let digits = 0;
    let leading = 0;
    for (let i = start; i < end; i++) {
      const ch = value.charCodeAt(i);
      if (ch === 46) {
        if (digits === 0 || num > 255 || leading === 48 && digits > 1)
          return false;
        dots++;
        num = 0;
        digits = 0;
        leading = 0;
      } else if (ch >= 48 && ch <= 57) {
        if (digits === 0)
          leading = ch;
        num = num * 10 + (ch - 48);
        digits++;
      } else {
        return false;
      }
    }
    return dots === 3 && digits > 0 && num <= 255 && !(leading === 48 && digits > 1);
  }
  function IsIPv4(value) {
    return IsIPv4Internal(value, 0, value.length);
  }

  // runtime/node_modules/typebox/build/format/ipv6.mjs
  function InRange(ch) {
    return ch >= 48 && ch <= 57 || // 0-9
    ch >= 65 && ch <= 70 || // A-F
    ch >= 97 && ch <= 102;
  }
  function IsIPv6(value) {
    const length = value.length;
    if (length === 0)
      return false;
    let groups = 0;
    let compressed = false;
    let i = 0;
    if (value.charCodeAt(0) === 58 && value.charCodeAt(1) === 58) {
      if (length === 2)
        return true;
      compressed = true;
      i = 2;
    }
    while (i < length) {
      let digits = 0;
      const start = i;
      while (i < length && InRange(value.charCodeAt(i))) {
        i++;
        digits++;
      }
      if (digits === 0)
        return false;
      const next = value.charCodeAt(i);
      if (next === 46) {
        if (!IsIPv4Internal(value, start, length))
          return false;
        groups += 2;
        i = length;
        break;
      }
      if (digits > 4)
        return false;
      groups++;
      if (i === length)
        break;
      if (next !== 58)
        return false;
      i++;
      if (value.charCodeAt(i) === 58) {
        if (compressed)
          return false;
        if (value.charCodeAt(i + 1) === 58)
          return false;
        compressed = true;
        i++;
        if (i === length)
          break;
      }
    }
    return compressed ? groups <= 7 : groups === 8;
  }

  // runtime/node_modules/typebox/build/format/iri_reference.mjs
  function TryUrl(value) {
    try {
      new URL(value, "http://example.com");
      return true;
    } catch {
      return false;
    }
  }
  function IsIriReference(value) {
    if (value.includes(" ")) {
      return false;
    }
    if (value.includes("\\")) {
      return false;
    }
    if (/[\x00-\x1F\x7F]/.test(value)) {
      return false;
    }
    if (/%(?![0-9a-fA-F]{2})/.test(value)) {
      return false;
    }
    if (value === "") {
      return true;
    }
    const colonIndex = value.indexOf(":");
    const hasValidSchemePrefix = colonIndex > 0 && // Colon must not be at the very beginning (e.g., ":foo")
    /^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(value.substring(0, colonIndex));
    if (hasValidSchemePrefix) {
      return TryUrl(value);
    } else {
      const looksLikeMalformedSchemeAndAuthority = value.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*)(\/\/)/);
      if (looksLikeMalformedSchemeAndAuthority && colonIndex === -1) {
        return false;
      }
      return TryUrl(value);
    }
  }

  // runtime/node_modules/typebox/build/format/iri.mjs
  function IsIri(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  // runtime/node_modules/typebox/build/format/json_pointer_uri_fragment.mjs
  var JsonPointerUriFragment = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i;
  function IsJsonPointerUriFragment(value) {
    return JsonPointerUriFragment.test(value);
  }

  // runtime/node_modules/typebox/build/format/json_pointer.mjs
  var JsonPointer = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
  function IsJsonPointer(value) {
    return JsonPointer.test(value);
  }

  // runtime/node_modules/typebox/build/format/regex.mjs
  function IsRegex(value) {
    if (value.length === 0) {
      return false;
    }
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  }

  // runtime/node_modules/typebox/build/format/relative_json_pointer.mjs
  var RelativeJsonPointer = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;
  function IsRelativeJsonPointer(value) {
    return RelativeJsonPointer.test(value);
  }

  // runtime/node_modules/typebox/build/format/uri_reference.mjs
  var UriReference = /^(?!.*[^\x00-\x7F])(?!.*\\)(?:(?:[a-z][a-z0-9+\-.]*:)?(?:\/\/[^\s[\]{}<>^`|]*)?|[^\s[\]{}<>^`|]*)(?:\?[^\s[\]{}<>^`|]*)?(?:#[^\s[\]{}<>^`|]*)?$/i;
  function IsUriReference(value) {
    return UriReference.test(value);
  }

  // runtime/node_modules/typebox/build/format/uri_template.mjs
  var UriTemplate = /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i;
  function IsUriTemplate(value) {
    return UriTemplate.test(value);
  }

  // runtime/node_modules/typebox/build/format/uri.mjs
  function IsAlpha(ch) {
    return ch >= 97 && ch <= 122 || ch >= 65 && ch <= 90;
  }
  function IsAlphaNumeric(ch) {
    return IsAlpha(ch) || ch >= 48 && ch <= 57;
  }
  function IsHex(ch) {
    return ch >= 48 && ch <= 57 || // 0-9
    ch >= 65 && ch <= 70 || // A-F
    ch >= 97 && ch <= 102;
  }
  function IsSchemeChar(ch) {
    return IsAlphaNumeric(ch) || ch === 43 || ch === 45 || ch === 46;
  }
  function IsUnreserved(ch) {
    return IsAlphaNumeric(ch) || ch === 45 || ch === 46 || // '-', '.'
    ch === 95 || ch === 126;
  }
  function IsSubDelim(ch) {
    return ch === 33 || ch === 36 || ch === 38 || ch === 39 || ch === 40 || ch === 41 || ch === 42 || ch === 43 || ch === 44 || ch === 59 || ch === 61;
  }
  function IsPchar(ch) {
    return IsUnreserved(ch) || IsSubDelim(ch) || ch === 58 || ch === 64;
  }
  function IsUri(value) {
    const length = value.length;
    if (length === 0)
      return false;
    if (!IsAlpha(value.charCodeAt(0)))
      return false;
    let i = 1;
    while (i < length) {
      const ch = value.charCodeAt(i);
      if (ch === 58)
        break;
      if (!IsSchemeChar(ch))
        return false;
      i++;
    }
    if (value.charCodeAt(i) !== 58)
      return false;
    i++;
    if (value.charCodeAt(i) === 47 && value.charCodeAt(i + 1) === 47) {
      i += 2;
      const authorityStart = i;
      let atPos = -1;
      for (let j = i; j < length; j++) {
        const ch = value.charCodeAt(j);
        if (ch === 64) {
          atPos = j;
          break;
        }
        if (ch === 47 || ch === 63 || ch === 35)
          break;
      }
      if (atPos !== -1) {
        for (let j = authorityStart; j < atPos; j++) {
          const ch = value.charCodeAt(j);
          if (ch === 91 || ch === 93)
            return false;
          if (ch === 37) {
            if (j + 2 >= atPos || !IsHex(value.charCodeAt(j + 1)) || !IsHex(value.charCodeAt(j + 2)))
              return false;
            j += 2;
          } else if (!IsUnreserved(ch) && !IsSubDelim(ch) && ch !== 58)
            return false;
        }
        i = atPos + 1;
      }
      if (value.charCodeAt(i) === 91) {
        i++;
        while (i < length && value.charCodeAt(i) !== 93)
          i++;
        if (value.charCodeAt(i) !== 93)
          return false;
        i++;
      } else {
        while (i < length) {
          const ch = value.charCodeAt(i);
          if (ch === 47 || ch === 63 || ch === 35 || ch === 58)
            break;
          if (ch < 128 && !IsUnreserved(ch) && !IsSubDelim(ch))
            return false;
          i++;
        }
      }
      if (value.charCodeAt(i) === 58) {
        i++;
        while (i < length) {
          const ch = value.charCodeAt(i);
          if (ch === 47 || ch === 63 || ch === 35)
            break;
          if (ch < 48 || ch > 57)
            return false;
          i++;
        }
      }
    }
    while (i < length) {
      const ch = value.charCodeAt(i);
      if (ch === 37) {
        if (i + 2 >= length || !IsHex(value.charCodeAt(i + 1)) || !IsHex(value.charCodeAt(i + 2)))
          return false;
        i += 2;
      } else if (ch > 127) {
        return false;
      } else if (!(IsPchar(ch) || ch === 47 || ch === 63 || ch === 35)) {
        return false;
      }
      i++;
    }
    return true;
  }

  // runtime/node_modules/typebox/build/format/url.mjs
  var Url = /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu;
  function IsUrl(value) {
    return Url.test(value);
  }

  // runtime/node_modules/typebox/build/format/uuid.mjs
  var Uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  function IsUuid(value) {
    return Uuid.test(value);
  }

  // runtime/node_modules/typebox/build/format/_registry.mjs
  var formats = /* @__PURE__ */ new Map();
  function Clear() {
    formats.clear();
  }
  function Entries3() {
    return [...formats.entries()];
  }
  function Set3(format, check) {
    formats.set(format, check);
  }
  function Has(format) {
    return formats.has(format);
  }
  function Get3(format) {
    return formats.get(format);
  }
  function Test(format, value) {
    return formats.get(format)?.(value) ?? true;
  }
  function Reset2() {
    Clear();
    formats.set("date-time", IsDateTime);
    formats.set("date", IsDate2);
    formats.set("duration", IsDuration);
    formats.set("email", IsEmail);
    formats.set("hostname", IsHostname);
    formats.set("idn-email", IsIdnEmail);
    formats.set("idn-hostname", IsIdnHostname);
    formats.set("ipv4", IsIPv4);
    formats.set("ipv6", IsIPv6);
    formats.set("iri-reference", IsIriReference);
    formats.set("iri", IsIri);
    formats.set("json-pointer-uri-fragment", IsJsonPointerUriFragment);
    formats.set("json-pointer", IsJsonPointer);
    formats.set("regex", IsRegex);
    formats.set("relative-json-pointer", IsRelativeJsonPointer);
    formats.set("time", IsTime);
    formats.set("uri-reference", IsUriReference);
    formats.set("uri-template", IsUriTemplate);
    formats.set("uri", IsUri);
    formats.set("url", IsUrl);
    formats.set("uuid", IsUuid);
  }
  Reset2();

  // runtime/node_modules/typebox/build/schema/engine/format.mjs
  function BuildFormat(_stack, _context, schema, value) {
    return emit_exports.Call(emit_exports.Member("Format", "Test"), [emit_exports.Constant(schema.format), value]);
  }
  function CheckFormat(_stack, _context, schema, value) {
    return format_exports.Test(schema.format, value);
  }
  function ErrorFormat(stack, context, schemaPath, instancePath, schema, value) {
    return CheckFormat(stack, context, schema, value) || context.AddError({
      keyword: "format",
      schemaPath,
      instancePath,
      params: { format: schema.format }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/if.mjs
  function BuildIf(stack, context, schema, value) {
    const thenSchema = IsThen(schema) ? schema.then : true;
    const elseSchema = IsElse(schema) ? schema.else : true;
    return emit_exports.Ternary(BuildSchema(stack, context, schema.if, value), BuildSchema(stack, context, thenSchema, value), BuildSchema(stack, context, elseSchema, value));
  }
  function CheckIf(stack, context, schema, value) {
    const thenSchema = IsThen(schema) ? schema.then : true;
    const elseSchema = IsElse(schema) ? schema.else : true;
    return CheckSchema(stack, context, schema.if, value) ? CheckSchema(stack, context, thenSchema, value) : CheckSchema(stack, context, elseSchema, value);
  }
  function ErrorIf(stack, context, schemaPath, instancePath, schema, value) {
    const thenSchema = IsThen(schema) ? schema.then : true;
    const elseSchema = IsElse(schema) ? schema.else : true;
    const trueContext = new AccumulatedErrorContext();
    const isIf = ErrorSchema(stack, trueContext, `${schemaPath}/if`, instancePath, schema.if, value) ? ErrorSchema(stack, trueContext, `${schemaPath}/then`, instancePath, thenSchema, value) || context.AddError({
      keyword: "if",
      schemaPath,
      instancePath,
      params: { failingKeyword: "then" }
    }) : ErrorSchema(stack, context, `${schemaPath}/else`, instancePath, elseSchema, value) || context.AddError({
      keyword: "if",
      schemaPath,
      instancePath,
      params: { failingKeyword: "else" }
    });
    if (isIf)
      context.Merge([trueContext]);
    return isIf;
  }

  // runtime/node_modules/typebox/build/schema/engine/items.mjs
  function BuildItemsSized(stack, context, schema, value) {
    return emit_exports.ReduceAnd(schema.items.map((schema2, index3) => {
      const isLength = emit_exports.IsLessEqualThan(emit_exports.Member(value, "length"), emit_exports.Constant(index3));
      const isSchema = BuildSchemaPushStack(stack, context, schema2, `${value}[${index3}]`);
      const addIndex = context.AddIndex(emit_exports.Constant(index3));
      const guarded = context.UseUnevaluated() ? emit_exports.And(isSchema, addIndex) : isSchema;
      return emit_exports.Or(isLength, guarded);
    }));
  }
  function CheckItemsSized(stack, context, schema, value) {
    return guard_exports.Every(schema.items, 0, (schema2, index3) => {
      return guard_exports.IsLessEqualThan(value.length, index3) || CheckSchemaPushStack(stack, context, schema2, value[index3]) && context.AddIndex(index3);
    });
  }
  function ErrorItemsSized(stack, context, schemaPath, instancePath, schema, value) {
    return guard_exports.EveryAll(schema.items, 0, (schema2, index3) => {
      const nextSchemaPath = `${schemaPath}/items/${index3}`;
      const nextInstancePath = `${instancePath}/${index3}`;
      return guard_exports.IsLessEqualThan(value.length, index3) || ErrorSchemaPushStack(stack, context, nextSchemaPath, nextInstancePath, schema2, value[index3]) && context.AddIndex(index3);
    });
  }
  function BuildItemsUnsized(stack, context, schema, value) {
    const offset = IsPrefixItems(schema) ? schema.prefixItems.length : 0;
    const isSchema = BuildSchemaPushStack(stack, context, schema.items, "element");
    const addIndex = context.AddIndex("index");
    const guarded = context.UseUnevaluated() ? emit_exports.And(isSchema, addIndex) : isSchema;
    return emit_exports.Every(value, emit_exports.Constant(offset), ["element", "index"], guarded);
  }
  function CheckItemsUnsized(stack, context, schema, value) {
    const offset = IsPrefixItems(schema) ? schema.prefixItems.length : 0;
    return guard_exports.Every(value, offset, (element, index3) => {
      return CheckSchemaPushStack(stack, context, schema.items, element) && context.AddIndex(index3);
    });
  }
  function ErrorItemsUnsized(stack, context, schemaPath, instancePath, schema, value) {
    const offset = IsPrefixItems(schema) ? schema.prefixItems.length : 0;
    return guard_exports.EveryAll(value, offset, (element, index3) => {
      const nextSchemaPath = `${schemaPath}/items`;
      const nextInstancePath = `${instancePath}/${index3}`;
      return ErrorSchemaPushStack(stack, context, nextSchemaPath, nextInstancePath, schema.items, element) && context.AddIndex(index3);
    });
  }
  function BuildItems(stack, context, schema, value) {
    return IsItemsSized(schema) ? BuildItemsSized(stack, context, schema, value) : BuildItemsUnsized(stack, context, schema, value);
  }
  function CheckItems(stack, context, schema, value) {
    return IsItemsSized(schema) ? CheckItemsSized(stack, context, schema, value) : CheckItemsUnsized(stack, context, schema, value);
  }
  function ErrorItems(stack, context, schemaPath, instancePath, schema, value) {
    return IsItemsSized(schema) ? ErrorItemsSized(stack, context, schemaPath, instancePath, schema, value) : ErrorItemsUnsized(stack, context, schemaPath, instancePath, schema, value);
  }

  // runtime/node_modules/typebox/build/schema/engine/maxContains.mjs
  function IsValid3(schema) {
    return IsContains(schema);
  }
  function BuildMaxContains(stack, context, schema, value) {
    if (!IsValid3(schema))
      return emit_exports.Constant(true);
    const [result, item] = [Unique(), Unique()];
    const count = emit_exports.Call(emit_exports.Member(value, "reduce"), [emit_exports.ArrowFunction([result, item], emit_exports.Ternary(BuildSchema(stack, context, schema.contains, item), emit_exports.PrefixIncrement(result), result)), emit_exports.Constant(0)]);
    return emit_exports.IsLessEqualThan(count, emit_exports.Constant(schema.maxContains));
  }
  function CheckMaxContains(stack, context, schema, value) {
    if (!IsValid3(schema))
      return true;
    const count = value.reduce((result, item) => CheckSchema(stack, context, schema.contains, item) ? ++result : result, 0);
    return guard_exports.IsLessEqualThan(count, schema.maxContains);
  }
  function ErrorMaxContains(stack, context, schemaPath, instancePath, schema, value) {
    const minContains = IsMinContains(schema) ? schema.minContains : 1;
    return CheckMaxContains(stack, context, schema, value) || context.AddError({
      keyword: "contains",
      schemaPath,
      instancePath,
      params: { minContains, maxContains: schema.maxContains }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/maximum.mjs
  function BuildMaximum(_stack, _context, schema, value) {
    return emit_exports.IsLessEqualThan(value, emit_exports.Constant(schema.maximum));
  }
  function CheckMaximum(_stack, _context, schema, value) {
    return guard_exports.IsLessEqualThan(value, schema.maximum);
  }
  function ErrorMaximum(stack, context, schemaPath, instancePath, schema, value) {
    return CheckMaximum(stack, context, schema, value) || context.AddError({
      keyword: "maximum",
      schemaPath,
      instancePath,
      params: { comparison: "<=", limit: schema.maximum }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/maxItems.mjs
  function BuildMaxItems(_stack, _context, schema, value) {
    return emit_exports.IsLessEqualThan(emit_exports.Member(value, "length"), emit_exports.Constant(schema.maxItems));
  }
  function CheckMaxItems(_stack, _context, schema, value) {
    return guard_exports.IsLessEqualThan(value.length, schema.maxItems);
  }
  function ErrorMaxItems(stack, context, schemaPath, instancePath, schema, value) {
    return CheckMaxItems(stack, context, schema, value) || context.AddError({
      keyword: "maxItems",
      schemaPath,
      instancePath,
      params: { limit: schema.maxItems }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/maxLength.mjs
  function BuildMaxLength(_stack, _context, schema, value) {
    return emit_exports.IsMaxLength(value, emit_exports.Constant(schema.maxLength));
  }
  function CheckMaxLength(_stack, _context, schema, value) {
    return guard_exports.IsMaxLength(value, schema.maxLength);
  }
  function ErrorMaxLength(stack, context, schemaPath, instancePath, schema, value) {
    return CheckMaxLength(stack, context, schema, value) || context.AddError({
      keyword: "maxLength",
      schemaPath,
      instancePath,
      params: { limit: schema.maxLength }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/maxProperties.mjs
  function BuildMaxProperties(_stack, _context, schema, value) {
    return emit_exports.IsLessEqualThan(emit_exports.Member(emit_exports.Keys(value), "length"), emit_exports.Constant(schema.maxProperties));
  }
  function CheckMaxProperties(_stack, _context, schema, value) {
    return guard_exports.IsLessEqualThan(guard_exports.Keys(value).length, schema.maxProperties);
  }
  function ErrorMaxProperties(stack, context, schemaPath, instancePath, schema, value) {
    return CheckMaxProperties(stack, context, schema, value) || context.AddError({
      keyword: "maxProperties",
      schemaPath,
      instancePath,
      params: { limit: schema.maxProperties }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/minContains.mjs
  function IsValid4(schema) {
    return IsContains(schema);
  }
  function BuildMinContains(stack, context, schema, value) {
    if (!IsValid4(schema))
      return emit_exports.Constant(true);
    const [result, item] = [Unique(), Unique()];
    const count = emit_exports.Call(emit_exports.Member(value, "reduce"), [emit_exports.ArrowFunction([result, item], emit_exports.Ternary(BuildSchema(stack, context, schema.contains, item), emit_exports.PrefixIncrement(result), result)), emit_exports.Constant(0)]);
    return emit_exports.IsGreaterEqualThan(count, emit_exports.Constant(schema.minContains));
  }
  function CheckMinContains(stack, context, schema, value) {
    if (!IsValid4(schema))
      return true;
    const count = value.reduce((result, item) => CheckSchema(stack, context, schema.contains, item) ? ++result : result, 0);
    return guard_exports.IsGreaterEqualThan(count, schema.minContains);
  }
  function ErrorMinContains(stack, context, schemaPath, instancePath, schema, value) {
    return CheckMinContains(stack, context, schema, value) || context.AddError({
      keyword: "contains",
      schemaPath,
      instancePath,
      params: { minContains: schema.minContains }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/minimum.mjs
  function BuildMinimum(_stack, _context, schema, value) {
    return emit_exports.IsGreaterEqualThan(value, emit_exports.Constant(schema.minimum));
  }
  function CheckMinimum(_stack, _context, schema, value) {
    return guard_exports.IsGreaterEqualThan(value, schema.minimum);
  }
  function ErrorMinimum(stack, context, schemaPath, instancePath, schema, value) {
    return CheckMinimum(stack, context, schema, value) || context.AddError({
      keyword: "minimum",
      schemaPath,
      instancePath,
      params: { comparison: ">=", limit: schema.minimum }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/minItems.mjs
  function BuildMinItems(_stack, _context, schema, value) {
    return emit_exports.IsGreaterEqualThan(emit_exports.Member(value, "length"), emit_exports.Constant(schema.minItems));
  }
  function CheckMinItems(_stack, _context, schema, value) {
    return guard_exports.IsGreaterEqualThan(value.length, schema.minItems);
  }
  function ErrorMinItems(stack, context, schemaPath, instancePath, schema, value) {
    return CheckMinItems(stack, context, schema, value) || context.AddError({
      keyword: "minItems",
      schemaPath,
      instancePath,
      params: { limit: schema.minItems }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/minLength.mjs
  function BuildMinLength(_stack, _context, schema, value) {
    return emit_exports.IsMinLength(value, emit_exports.Constant(schema.minLength));
  }
  function CheckMinLength(_stack, _context, schema, value) {
    return guard_exports.IsMinLength(value, schema.minLength);
  }
  function ErrorMinLength(stack, context, schemaPath, instancePath, schema, value) {
    return CheckMinLength(stack, context, schema, value) || context.AddError({
      keyword: "minLength",
      schemaPath,
      instancePath,
      params: { limit: schema.minLength }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/minProperties.mjs
  function BuildMinProperties(_stack, _context, schema, value) {
    return emit_exports.IsGreaterEqualThan(emit_exports.Member(emit_exports.Keys(value), "length"), emit_exports.Constant(schema.minProperties));
  }
  function CheckMinProperties(_stack, _context, schema, value) {
    return guard_exports.IsGreaterEqualThan(guard_exports.Keys(value).length, schema.minProperties);
  }
  function ErrorMinProperties(stack, context, schemaPath, instancePath, schema, value) {
    return CheckMinProperties(stack, context, schema, value) || context.AddError({
      keyword: "minProperties",
      schemaPath,
      instancePath,
      params: { limit: schema.minProperties }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/multipleOf.mjs
  function BuildMultipleOf(_stack, _context, schema, value) {
    return emit_exports.MultipleOf(value, emit_exports.Constant(schema.multipleOf));
  }
  function CheckMultipleOf(_stack, _context, schema, value) {
    return guard_exports.IsMultipleOf(value, schema.multipleOf);
  }
  function ErrorMultipleOf(stack, context, schemaPath, instancePath, schema, value) {
    return CheckMultipleOf(stack, context, schema, value) || context.AddError({
      keyword: "multipleOf",
      schemaPath,
      instancePath,
      params: { multipleOf: schema.multipleOf }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/not.mjs
  function BuildNotUnevaluated(stack, context, schema, value) {
    return Reducer(stack, context, [schema.not], value, emit_exports.Not(emit_exports.IsEqual(emit_exports.Member("results", "length"), emit_exports.Constant(1))));
  }
  function BuildNotFast(stack, context, schema, value) {
    return emit_exports.Not(BuildSchema(stack, context, schema.not, value));
  }
  function BuildNot(stack, context, schema, value) {
    return context.UseUnevaluated() ? BuildNotUnevaluated(stack, context, schema, value) : BuildNotFast(stack, context, schema, value);
  }
  function CheckNot(stack, context, schema, value) {
    const nextContext = new CheckContext();
    const isSchema = !CheckSchema(stack, nextContext, schema.not, value);
    const isNot = isSchema && context.Merge([nextContext]);
    return isNot;
  }
  function ErrorNot(stack, context, schemaPath, instancePath, schema, value) {
    return CheckNot(stack, context, schema, value) || context.AddError({
      keyword: "not",
      schemaPath,
      instancePath,
      params: {}
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/oneOf.mjs
  function BuildOneOfUnevaluated(stack, context, schema, value) {
    return Reducer(stack, context, schema.oneOf, value, emit_exports.IsEqual(emit_exports.Member("results", "length"), emit_exports.Constant(1)));
  }
  function BuildOneOfFast(stack, context, schema, value) {
    const results = emit_exports.ArrayLiteral(schema.oneOf.map((schema2) => BuildSchema(stack, context, schema2, value)));
    const count = emit_exports.Call(emit_exports.Member(results, "reduce"), [
      emit_exports.ArrowFunction(["count", "result"], emit_exports.Ternary(emit_exports.IsEqual("result", emit_exports.Constant(true)), emit_exports.PrefixIncrement("count"), "count")),
      emit_exports.Constant(0)
    ]);
    return emit_exports.IsEqual(count, emit_exports.Constant(1));
  }
  function BuildOneOf(stack, context, schema, value) {
    return context.UseUnevaluated() ? BuildOneOfUnevaluated(stack, context, schema, value) : BuildOneOfFast(stack, context, schema, value);
  }
  function CheckOneOf(stack, context, schema, value) {
    const passedContexts = schema.oneOf.reduce((result, schema2) => {
      const nextContext = new CheckContext();
      return CheckSchema(stack, nextContext, schema2, value) ? [...result, nextContext] : result;
    }, []);
    return guard_exports.IsEqual(passedContexts.length, 1) && context.Merge(passedContexts);
  }
  function ErrorOneOf(stack, context, schemaPath, instancePath, schema, value) {
    const failedContexts = [];
    const passingSchemas = [];
    const passedContexts = schema.oneOf.reduce((result, schema2, index3) => {
      const nextContext = new AccumulatedErrorContext();
      const nextSchemaPath = `${schemaPath}/oneOf/${index3}`;
      const isSchema = ErrorSchema(stack, nextContext, nextSchemaPath, instancePath, schema2, value);
      if (isSchema)
        passingSchemas.push(index3);
      if (!isSchema)
        failedContexts.push(nextContext);
      return isSchema ? [...result, nextContext] : result;
    }, []);
    const isOneOf = guard_exports.IsEqual(passedContexts.length, 1) && context.Merge(passedContexts);
    if (!isOneOf && guard_exports.IsEqual(passingSchemas.length, 0))
      failedContexts.forEach((failed) => failed.GetErrors().forEach((error) => context.AddError(error)));
    return isOneOf || context.AddError({
      keyword: "oneOf",
      schemaPath,
      instancePath,
      params: { passingSchemas }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/pattern.mjs
  function BuildPattern(_stack, _context, schema, value) {
    const regexp = CreateVariable(guard_exports.IsString(schema.pattern) ? new RegExp(schema.pattern, "u") : schema.pattern);
    return emit_exports.Call(emit_exports.Member(regexp, "test"), [value]);
  }
  function CheckPattern(_stack, _context, schema, value) {
    const regexp = guard_exports.IsString(schema.pattern) ? new RegExp(schema.pattern, "u") : schema.pattern;
    return regexp.test(value);
  }
  function ErrorPattern(stack, context, schemaPath, instancePath, schema, value) {
    return CheckPattern(stack, context, schema, value) || context.AddError({
      keyword: "pattern",
      schemaPath,
      instancePath,
      params: { pattern: schema.pattern }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/patternProperties.mjs
  function BuildPatternProperties(stack, context, schema, value) {
    return emit_exports.ReduceAnd(guard_exports.Entries(schema.patternProperties).map(([pattern, schema2]) => {
      const [key, prop] = [Unique(), Unique()];
      const regexp = CreateVariable(new RegExp(pattern, "u"));
      const notKey = emit_exports.Not(emit_exports.Call(emit_exports.Member(regexp, "test"), [key]));
      const isSchema = BuildSchemaPushStack(stack, context, schema2, prop);
      const addKey = context.AddKey(key);
      const guarded = context.UseUnevaluated() ? emit_exports.Or(notKey, emit_exports.And(isSchema, addKey)) : emit_exports.Or(notKey, isSchema);
      return emit_exports.Every(emit_exports.Entries(value), emit_exports.Constant(0), [`[${key}, ${prop}]`, "_"], guarded);
    }));
  }
  function CheckPatternProperties(stack, context, schema, value) {
    return guard_exports.Every(guard_exports.Entries(schema.patternProperties), 0, ([pattern, schema2]) => {
      const regexp = new RegExp(pattern, "u");
      return guard_exports.Every(guard_exports.Entries(value), 0, ([key, prop]) => {
        return !regexp.test(key) || CheckSchemaPushStack(stack, context, schema2, prop) && context.AddKey(key);
      });
    });
  }
  function ErrorPatternProperties(stack, context, schemaPath, instancePath, schema, value) {
    return guard_exports.EveryAll(guard_exports.Entries(schema.patternProperties), 0, ([pattern, schema2]) => {
      const nextSchemaPath = `${schemaPath}/patternProperties/${pattern}`;
      const regexp = new RegExp(pattern, "u");
      return guard_exports.EveryAll(guard_exports.Entries(value), 0, ([key, value2]) => {
        const nextInstancePath = `${instancePath}/${key}`;
        const notKey = !regexp.test(key);
        return notKey || ErrorSchemaPushStack(stack, context, nextSchemaPath, nextInstancePath, schema2, value2) && context.AddKey(key);
      });
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/prefixItems.mjs
  function BuildPrefixItems(stack, context, schema, value) {
    return emit_exports.ReduceAnd(schema.prefixItems.map((schema2, index3) => {
      const isLength = emit_exports.IsLessEqualThan(emit_exports.Member(value, "length"), emit_exports.Constant(index3));
      const isSchema = BuildSchemaPushStack(stack, context, schema2, `${value}[${index3}]`);
      const addIndex = context.AddIndex(emit_exports.Constant(index3));
      const guarded = context.UseUnevaluated() ? emit_exports.And(isSchema, addIndex) : isSchema;
      return emit_exports.Or(isLength, guarded);
    }));
  }
  function CheckPrefixItems(stack, context, schema, value) {
    return guard_exports.IsEqual(value.length, 0) || guard_exports.Every(schema.prefixItems, 0, (schema2, index3) => {
      return guard_exports.IsLessEqualThan(value.length, index3) || CheckSchemaPushStack(stack, context, schema2, value[index3]) && context.AddIndex(index3);
    });
  }
  function ErrorPrefixItems(stack, context, schemaPath, instancePath, schema, value) {
    return guard_exports.IsEqual(value.length, 0) || guard_exports.EveryAll(schema.prefixItems, 0, (schema2, index3) => {
      const nextSchemaPath = `${schemaPath}/prefixItems/${index3}`;
      const nextInstancePath = `${instancePath}/${index3}`;
      return guard_exports.IsLessEqualThan(value.length, index3) || ErrorSchemaPushStack(stack, context, nextSchemaPath, nextInstancePath, schema2, value[index3]) && context.AddIndex(index3);
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/_exact_optional.mjs
  function IsExactOptional(required, key) {
    return required.includes(key) || settings_exports.Get().exactOptionalPropertyTypes;
  }
  function InexactOptionalBuild(value, key) {
    return emit_exports.IsUndefined(emit_exports.Member(value, key));
  }
  function InexactOptionalCheck(value, key) {
    return guard_exports.IsUndefined(value[key]);
  }

  // runtime/node_modules/typebox/build/schema/engine/properties.mjs
  function BuildProperties(stack, context, schema, value) {
    const required = IsRequired(schema) ? schema.required : [];
    const everyKey = guard_exports.Entries(schema.properties).map(([key, schema2]) => {
      const notKey = emit_exports.Not(emit_exports.HasPropertyKey(value, emit_exports.Constant(key)));
      const isSchema = BuildSchemaPushStack(stack, context, schema2, emit_exports.Member(value, key));
      const addKey = context.AddKey(emit_exports.Constant(key));
      const guarded = context.UseUnevaluated() ? emit_exports.And(isSchema, addKey) : isSchema;
      const isProperty = required.includes(key) ? guarded : emit_exports.Or(notKey, guarded);
      return IsExactOptional(required, key) ? isProperty : emit_exports.Or(InexactOptionalBuild(value, key), isProperty);
    });
    return emit_exports.ReduceAnd(everyKey);
  }
  function CheckProperties(stack, context, schema, value) {
    const required = IsRequired(schema) ? schema.required : [];
    const isProperties = guard_exports.Every(guard_exports.Entries(schema.properties), 0, ([key, schema2]) => {
      const isProperty = !guard_exports.HasPropertyKey(value, key) || CheckSchemaPushStack(stack, context, schema2, value[key]) && context.AddKey(key);
      return IsExactOptional(required, key) ? isProperty : InexactOptionalCheck(value, key) || isProperty;
    });
    return isProperties;
  }
  function ErrorProperties(stack, context, schemaPath, instancePath, schema, value) {
    const required = IsRequired(schema) ? schema.required : [];
    const isProperties = guard_exports.EveryAll(guard_exports.Entries(schema.properties), 0, ([key, schema2]) => {
      const nextSchemaPath = `${schemaPath}/properties/${key}`;
      const nextInstancePath = `${instancePath}/${key}`;
      const isProperty = () => !guard_exports.HasPropertyKey(value, key) || ErrorSchemaPushStack(stack, context, nextSchemaPath, nextInstancePath, schema2, value[key]) && context.AddKey(key);
      return IsExactOptional(required, key) ? isProperty() : InexactOptionalCheck(value, key) || isProperty();
    });
    return isProperties;
  }

  // runtime/node_modules/typebox/build/schema/engine/propertyNames.mjs
  function BuildPropertyNames(stack, context, schema, value) {
    const [key, _index] = [Unique(), Unique()];
    return emit_exports.Every(emit_exports.Keys(value), emit_exports.Constant(0), [key, _index], BuildSchema(stack, context, schema.propertyNames, key));
  }
  function CheckPropertyNames(stack, context, schema, value) {
    return guard_exports.Every(guard_exports.Keys(value), 0, (key, _index) => CheckSchema(stack, context, schema.propertyNames, key));
  }
  function ErrorPropertyNames(stack, context, schemaPath, instancePath, schema, value) {
    const propertyNames = [];
    const isPropertyNames = guard_exports.EveryAll(guard_exports.Keys(value), 0, (key, _index) => {
      const nextInstancePath = `${instancePath}/${key}`;
      const nextSchemaPath = `${schemaPath}/propertyNames`;
      const nextContext = new AccumulatedErrorContext();
      const isPropertyName = ErrorSchema(stack, nextContext, nextSchemaPath, nextInstancePath, schema.propertyNames, key);
      if (!isPropertyName)
        propertyNames.push(key);
      return isPropertyName;
    });
    return isPropertyNames || context.AddError({
      keyword: "propertyNames",
      schemaPath,
      instancePath,
      params: { propertyNames }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/recursiveRef.mjs
  function BuildRecursiveRef(stack, context, schema, value) {
    const target = stack.RecursiveRef(schema) ?? false;
    return CreateFunction(stack, context, target, value);
  }
  function CheckRecursiveRef(stack, context, schema, value) {
    const target = stack.RecursiveRef(schema) ?? false;
    return IsSchema2(target) && CheckSchema(stack, context, target, value);
  }
  function ErrorRecursiveRef(stack, context, _schemaPath, instancePath, schema, value) {
    const target = stack.RecursiveRef(schema) ?? false;
    return IsSchema2(target) && ErrorSchema(stack, context, "#", instancePath, target, value);
  }

  // runtime/node_modules/typebox/build/schema/engine/ref.mjs
  function BuildRefStandard(stack, context, target, value) {
    const interior = emit_exports.ArrowFunction(["context", "value"], CreateFunction(stack, context, target, "value"));
    const exterior = emit_exports.ArrowFunction(["context", "value"], emit_exports.Statements([
      emit_exports.ConstDeclaration("nextContext", emit_exports.New("CheckContext", [])),
      emit_exports.ConstDeclaration("result", emit_exports.Call(interior, ["nextContext", "value"])),
      emit_exports.If("result", context.Merge("[nextContext]")),
      emit_exports.Return("result")
    ]));
    return emit_exports.Call(exterior, ["context", value]);
  }
  function BuildRefFast(stack, context, target, value) {
    return CreateFunction(stack, context, target, value);
  }
  function BuildRef(stack, context, schema, value) {
    const target = stack.Ref(schema) ?? false;
    return context.UseUnevaluated() ? BuildRefStandard(stack, context, target, value) : BuildRefFast(stack, context, target, value);
  }
  function CheckRef(stack, context, schema, value) {
    const target = stack.Ref(schema) ?? false;
    const nextContext = new CheckContext();
    const result = IsSchema2(target) && CheckSchema(stack, nextContext, target, value);
    if (result)
      context.Merge([nextContext]);
    return result;
  }
  function ErrorRef(stack, context, _schemaPath, instancePath, schema, value) {
    const target = stack.Ref(schema) ?? false;
    const nextContext = new AccumulatedErrorContext();
    const result = IsSchema2(target) && ErrorSchema(stack, nextContext, "#", instancePath, target, value);
    if (result)
      context.Merge([nextContext]);
    if (!result)
      nextContext.GetErrors().forEach((error) => context.AddError(error));
    return result;
  }

  // runtime/node_modules/typebox/build/schema/engine/required.mjs
  function BuildRequired(_stack, _context, schema, value) {
    return emit_exports.ReduceAnd(schema.required.map((key) => emit_exports.HasPropertyKey(value, emit_exports.Constant(key))));
  }
  function CheckRequired(_stack, _context, schema, value) {
    return guard_exports.Every(schema.required, 0, (key) => guard_exports.HasPropertyKey(value, key));
  }
  function ErrorRequired(_stack, context, schemaPath, instancePath, schema, value) {
    const requiredProperties = [];
    const isRequired = guard_exports.EveryAll(schema.required, 0, (key) => {
      const hasKey = guard_exports.HasPropertyKey(value, key);
      if (!hasKey)
        requiredProperties.push(key);
      return hasKey;
    });
    return isRequired || context.AddError({
      keyword: "required",
      schemaPath,
      instancePath,
      params: { requiredProperties }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/type.mjs
  function BuildTypeName(_stack, _context, type, value) {
    return (
      // jsonschema
      guard_exports.IsEqual(type, "object") ? emit_exports.IsObjectNotArray(value) : guard_exports.IsEqual(type, "array") ? emit_exports.IsArray(value) : guard_exports.IsEqual(type, "boolean") ? emit_exports.IsBoolean(value) : guard_exports.IsEqual(type, "integer") ? emit_exports.IsInteger(value) : guard_exports.IsEqual(type, "number") ? emit_exports.IsNumber(value) : guard_exports.IsEqual(type, "null") ? emit_exports.IsNull(value) : guard_exports.IsEqual(type, "string") ? emit_exports.IsString(value) : (
        // xschema
        guard_exports.IsEqual(type, "bigint") ? emit_exports.IsBigInt(value) : guard_exports.IsEqual(type, "constructor") ? emit_exports.IsConstructor(value) : guard_exports.IsEqual(type, "function") ? emit_exports.IsFunction(value) : guard_exports.IsEqual(type, "symbol") ? emit_exports.IsSymbol(value) : guard_exports.IsEqual(type, "undefined") ? emit_exports.IsUndefined(value) : guard_exports.IsEqual(type, "void") ? emit_exports.IsUndefined(value) : emit_exports.Constant(true)
      )
    );
  }
  function CheckTypeName(_stack, _context, type, _schema, value) {
    return (
      // jsonschema
      guard_exports.IsEqual(type, "object") ? guard_exports.IsObjectNotArray(value) : guard_exports.IsEqual(type, "array") ? guard_exports.IsArray(value) : guard_exports.IsEqual(type, "boolean") ? guard_exports.IsBoolean(value) : guard_exports.IsEqual(type, "integer") ? guard_exports.IsInteger(value) : guard_exports.IsEqual(type, "number") ? guard_exports.IsNumber(value) : guard_exports.IsEqual(type, "null") ? guard_exports.IsNull(value) : guard_exports.IsEqual(type, "string") ? guard_exports.IsString(value) : (
        // xschema
        guard_exports.IsEqual(type, "bigint") ? guard_exports.IsBigInt(value) : guard_exports.IsEqual(type, "constructor") ? guard_exports.IsConstructor(value) : guard_exports.IsEqual(type, "function") ? guard_exports.IsFunction(value) : guard_exports.IsEqual(type, "symbol") ? guard_exports.IsSymbol(value) : guard_exports.IsEqual(type, "undefined") ? guard_exports.IsUndefined(value) : guard_exports.IsEqual(type, "void") ? guard_exports.IsUndefined(value) : true
      )
    );
  }
  function BuildTypeNames(stack, context, typenames, value) {
    return emit_exports.ReduceOr(typenames.map((type) => BuildTypeName(stack, context, type, value)));
  }
  function CheckTypeNames(stack, context, types, schema, value) {
    return types.some((type) => CheckTypeName(stack, context, type, schema, value));
  }
  function BuildType(stack, context, schema, value) {
    return guard_exports.IsArray(schema.type) ? BuildTypeNames(stack, context, schema.type, value) : BuildTypeName(stack, context, schema.type, value);
  }
  function CheckType(stack, context, schema, value) {
    return guard_exports.IsArray(schema.type) ? CheckTypeNames(stack, context, schema.type, schema, value) : CheckTypeName(stack, context, schema.type, schema, value);
  }
  function ErrorType(stack, context, schemaPath, instancePath, schema, value) {
    const isType = guard_exports.IsArray(schema.type) ? CheckTypeNames(stack, context, schema.type, schema, value) : CheckTypeName(stack, context, schema.type, schema, value);
    return isType || context.AddError({
      keyword: "type",
      schemaPath,
      instancePath,
      params: { type: schema.type }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/unevaluatedItems.mjs
  function BuildUnevaluatedItems(stack, context, schema, value) {
    const [index3, item] = [Unique(), Unique()];
    const indices = emit_exports.Call(emit_exports.Member("context", "GetIndices"), []);
    const hasIndex = emit_exports.Call(emit_exports.Member("indices", "has"), [index3]);
    const isSchema = BuildSchema(stack, context, schema.unevaluatedItems, item);
    const addIndex = emit_exports.Call(emit_exports.Member("context", "AddIndex"), [index3]);
    const isEvery = emit_exports.Every(value, emit_exports.Constant(0), [item, index3], emit_exports.And(emit_exports.Or(hasIndex, isSchema), addIndex));
    return emit_exports.Call(emit_exports.ArrowFunction(["context"], emit_exports.Statements([
      emit_exports.ConstDeclaration("indices", indices),
      emit_exports.Return(isEvery)
    ])), ["context"]);
  }
  function CheckUnevaluatedItems(stack, context, schema, value) {
    const indices = context.GetIndices();
    return guard_exports.Every(value, 0, (item, index3) => {
      return (indices.has(index3) || CheckSchema(stack, context, schema.unevaluatedItems, item)) && context.AddIndex(index3);
    });
  }
  function ErrorUnevaluatedItems(stack, context, schemaPath, instancePath, schema, value) {
    const indices = context.GetIndices();
    const unevaluatedItems = [];
    const isUnevaluatedItems = guard_exports.EveryAll(value, 0, (item, index3) => {
      const nextContext = new AccumulatedErrorContext();
      const isEvaluatedItem = (indices.has(index3) || ErrorSchema(stack, nextContext, schemaPath, instancePath, schema.unevaluatedItems, item)) && context.AddIndex(index3);
      if (!isEvaluatedItem)
        unevaluatedItems.push(index3);
      return isEvaluatedItem;
    });
    return isUnevaluatedItems || context.AddError({
      keyword: "unevaluatedItems",
      schemaPath,
      instancePath,
      params: { unevaluatedItems }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/unevaluatedProperties.mjs
  function BuildUnevaluatedProperties(stack, context, schema, value) {
    const [key, prop] = [Unique(), Unique()];
    const keys = emit_exports.Call(emit_exports.Member("context", "GetKeys"), []);
    const hasKey = emit_exports.Call(emit_exports.Member("keys", "has"), [key]);
    const addKey = emit_exports.Call(emit_exports.Member("context", "AddKey"), [key]);
    const isSchema = BuildSchema(stack, context, schema.unevaluatedProperties, prop);
    const isEvery = emit_exports.Every(emit_exports.Entries(value), emit_exports.Constant(0), [`[${key}, ${prop}]`, "_"], emit_exports.Or(hasKey, emit_exports.And(isSchema, addKey)));
    return emit_exports.Call(emit_exports.ArrowFunction(["context"], emit_exports.Statements([
      emit_exports.ConstDeclaration("keys", keys),
      emit_exports.Return(isEvery)
    ])), ["context"]);
  }
  function CheckUnevaluatedProperties(stack, context, schema, value) {
    const keys = context.GetKeys();
    return guard_exports.Every(guard_exports.Entries(value), 0, ([key, prop]) => {
      return keys.has(key) || CheckSchema(stack, context, schema.unevaluatedProperties, prop) && context.AddKey(key);
    });
  }
  function ErrorUnevaluatedProperties(stack, context, schemaPath, instancePath, schema, value) {
    const keys = context.GetKeys();
    const unevaluatedProperties = [];
    const isUnevaluatedProperties = guard_exports.EveryAll(guard_exports.Entries(value), 0, ([key, prop]) => {
      const nextContext = new AccumulatedErrorContext();
      const isEvaluatedProperty = keys.has(key) || ErrorSchema(stack, nextContext, schemaPath, instancePath, schema.unevaluatedProperties, prop) && context.AddKey(key);
      if (!isEvaluatedProperty)
        unevaluatedProperties.push(key);
      return isEvaluatedProperty;
    });
    return isUnevaluatedProperties || context.AddError({
      keyword: "unevaluatedProperties",
      schemaPath,
      instancePath,
      params: { unevaluatedProperties }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/uniqueItems.mjs
  function IsValid5(schema) {
    return !guard_exports.IsEqual(schema.uniqueItems, false);
  }
  function BuildUniqueItems(_stack, _context, schema, value) {
    if (!IsValid5(schema))
      return emit_exports.Constant(true);
    const set = emit_exports.Member(emit_exports.New("Set", [emit_exports.Call(emit_exports.Member(value, "map"), [emit_exports.Member("Hashing", "Hash")])]), "size");
    const isLength = emit_exports.Member(value, "length");
    return emit_exports.IsEqual(set, isLength);
  }
  function CheckUniqueItems(_stack, _context, schema, value) {
    if (!IsValid5(schema))
      return true;
    const set = new Set(value.map(hash_exports.Hash)).size;
    const isLength = value.length;
    return guard_exports.IsEqual(set, isLength);
  }
  function ErrorUniqueItems(_stack, context, schemaPath, instancePath, schema, value) {
    if (!IsValid5(schema))
      return true;
    const set = /* @__PURE__ */ new Set();
    const duplicateItems = value.reduce((result, value2, index3) => {
      const hash = hash_exports.Hash(value2);
      if (set.has(hash))
        return [...result, index3];
      set.add(hash);
      return result;
    }, []);
    const isUniqueItems = guard_exports.IsEqual(duplicateItems.length, 0);
    return isUniqueItems || context.AddError({
      keyword: "uniqueItems",
      schemaPath,
      instancePath,
      params: { duplicateItems }
    });
  }

  // runtime/node_modules/typebox/build/schema/engine/schema.mjs
  function HasTypeName(schema, typename) {
    return IsType(schema) && (guard_exports.IsArray(schema.type) && guard_exports.IsGreaterThan(schema.type.length, 0) && guard_exports.Every(schema.type, 0, (type) => guard_exports.IsEqual(type, typename)) || guard_exports.IsEqual(schema.type, typename));
  }
  function HasObjectType(schema) {
    return HasTypeName(schema, "object");
  }
  function HasObjectKeywords(schema) {
    return IsSchemaObject(schema) && (IsAdditionalProperties(schema) || IsDependencies(schema) || IsDependentRequired(schema) || IsDependentSchemas(schema) || IsProperties(schema) || IsPatternProperties(schema) || IsPropertyNames(schema) || IsMinProperties(schema) || IsMaxProperties(schema) || IsRequired(schema) || IsUnevaluatedProperties(schema));
  }
  function HasArrayType(schema) {
    return HasTypeName(schema, "array");
  }
  function HasArrayKeywords(schema) {
    return IsSchemaObject(schema) && (IsAdditionalItems(schema) || IsItems(schema) || IsContains(schema) || IsMaxContains(schema) || IsMaxItems(schema) || IsMinContains(schema) || IsMinItems(schema) || IsPrefixItems(schema) || IsUnevaluatedItems(schema) || IsUniqueItems(schema));
  }
  function HasStringType(schema) {
    return HasTypeName(schema, "string");
  }
  function HasStringKeywords(schema) {
    return IsSchemaObject(schema) && (IsMinLength4(schema) || IsMaxLength4(schema) || IsFormat(schema) || IsPattern(schema));
  }
  function HasNumberType(schema) {
    return HasTypeName(schema, "number") || HasTypeName(schema, "bigint");
  }
  function HasNumberKeywords(schema) {
    return IsSchemaObject(schema) && (IsMinimum(schema) || IsMaximum(schema) || IsExclusiveMaximum(schema) || IsExclusiveMinimum(schema) || IsMultipleOf2(schema));
  }
  function BuildSchemaPushStack(stack, context, schema, value) {
    return context.UseUnevaluated() ? emit_exports.And(emit_exports.And(context.Push(), BuildSchema(stack, context, schema, value)), context.Pop()) : BuildSchema(stack, context, schema, value);
  }
  function BuildSchema(stack, context, schema, value) {
    stack.Push(schema);
    const conditions = [];
    if (IsSchemaBoolean(schema))
      return BuildSchemaBoolean(stack, context, schema, value);
    if (IsType(schema))
      conditions.push(BuildType(stack, context, schema, value));
    if (HasObjectKeywords(schema)) {
      const constraints = [];
      if (IsRequired(schema))
        constraints.push(BuildRequired(stack, context, schema, value));
      if (IsAdditionalProperties(schema))
        constraints.push(BuildAdditionalProperties(stack, context, schema, value));
      if (IsDependencies(schema))
        constraints.push(BuildDependencies(stack, context, schema, value));
      if (IsDependentRequired(schema))
        constraints.push(BuildDependentRequired(stack, context, schema, value));
      if (IsDependentSchemas(schema))
        constraints.push(BuildDependentSchemas(stack, context, schema, value));
      if (IsPatternProperties(schema))
        constraints.push(BuildPatternProperties(stack, context, schema, value));
      if (IsProperties(schema))
        constraints.push(BuildProperties(stack, context, schema, value));
      if (IsPropertyNames(schema))
        constraints.push(BuildPropertyNames(stack, context, schema, value));
      if (IsMinProperties(schema))
        constraints.push(BuildMinProperties(stack, context, schema, value));
      if (IsMaxProperties(schema))
        constraints.push(BuildMaxProperties(stack, context, schema, value));
      const reduced = emit_exports.ReduceAnd(constraints);
      const guarded = emit_exports.Or(emit_exports.Not(emit_exports.IsObjectNotArray(value)), reduced);
      conditions.push(HasObjectType(schema) ? reduced : guarded);
    }
    if (HasArrayKeywords(schema)) {
      const constraints = [];
      if (IsAdditionalItems(schema))
        constraints.push(BuildAdditionalItems(stack, context, schema, value));
      if (IsContains(schema))
        constraints.push(BuildContains(stack, context, schema, value));
      if (IsItems(schema))
        constraints.push(BuildItems(stack, context, schema, value));
      if (IsMaxContains(schema))
        constraints.push(BuildMaxContains(stack, context, schema, value));
      if (IsMaxItems(schema))
        constraints.push(BuildMaxItems(stack, context, schema, value));
      if (IsMinContains(schema))
        constraints.push(BuildMinContains(stack, context, schema, value));
      if (IsMinItems(schema))
        constraints.push(BuildMinItems(stack, context, schema, value));
      if (IsPrefixItems(schema))
        constraints.push(BuildPrefixItems(stack, context, schema, value));
      if (IsUniqueItems(schema))
        constraints.push(BuildUniqueItems(stack, context, schema, value));
      const reduced = emit_exports.ReduceAnd(constraints);
      const guarded = emit_exports.Or(emit_exports.Not(emit_exports.IsArray(value)), reduced);
      conditions.push(HasArrayType(schema) ? reduced : guarded);
    }
    if (HasStringKeywords(schema)) {
      const constraints = [];
      if (IsMaxLength4(schema))
        constraints.push(BuildMaxLength(stack, context, schema, value));
      if (IsMinLength4(schema))
        constraints.push(BuildMinLength(stack, context, schema, value));
      if (IsFormat(schema))
        constraints.push(BuildFormat(stack, context, schema, value));
      if (IsPattern(schema))
        constraints.push(BuildPattern(stack, context, schema, value));
      const reduced = emit_exports.ReduceAnd(constraints);
      const guarded = emit_exports.Or(emit_exports.Not(emit_exports.IsString(value)), reduced);
      conditions.push(HasStringType(schema) ? reduced : guarded);
    }
    if (HasNumberKeywords(schema)) {
      const constraints = [];
      if (IsExclusiveMaximum(schema))
        constraints.push(BuildExclusiveMaximum(stack, context, schema, value));
      if (IsExclusiveMinimum(schema))
        constraints.push(BuildExclusiveMinimum(stack, context, schema, value));
      if (IsMaximum(schema))
        constraints.push(BuildMaximum(stack, context, schema, value));
      if (IsMinimum(schema))
        constraints.push(BuildMinimum(stack, context, schema, value));
      if (IsMultipleOf2(schema))
        constraints.push(BuildMultipleOf(stack, context, schema, value));
      const reduced = emit_exports.ReduceAnd(constraints);
      const guarded = emit_exports.Or(emit_exports.Not(emit_exports.Or(emit_exports.IsNumber(value), emit_exports.IsBigInt(value))), reduced);
      conditions.push(HasNumberType(schema) ? reduced : guarded);
    }
    if (IsRef2(schema))
      conditions.push(BuildRef(stack, context, schema, value));
    if (IsRecursiveRef(schema))
      conditions.push(BuildRecursiveRef(stack, context, schema, value));
    if (IsDynamicRef(schema))
      conditions.push(BuildDynamicRef(stack, context, schema, value));
    if (IsConst(schema))
      conditions.push(BuildConst(stack, context, schema, value));
    if (IsEnum2(schema))
      conditions.push(BuildEnum(stack, context, schema, value));
    if (IsIf(schema))
      conditions.push(BuildIf(stack, context, schema, value));
    if (IsNot(schema))
      conditions.push(BuildNot(stack, context, schema, value));
    if (IsAllOf(schema))
      conditions.push(BuildAllOf(stack, context, schema, value));
    if (IsAnyOf(schema))
      conditions.push(BuildAnyOf(stack, context, schema, value));
    if (IsOneOf(schema))
      conditions.push(BuildOneOf(stack, context, schema, value));
    if (IsUnevaluatedItems(schema))
      conditions.push(emit_exports.Or(emit_exports.Not(emit_exports.IsArray(value)), BuildUnevaluatedItems(stack, context, schema, value)));
    if (IsUnevaluatedProperties(schema))
      conditions.push(emit_exports.Or(emit_exports.Not(emit_exports.IsObject(value)), BuildUnevaluatedProperties(stack, context, schema, value)));
    if (IsRefine2(schema))
      conditions.push(BuildRefine(stack, context, schema, value));
    const result = emit_exports.ReduceAnd(conditions);
    stack.Pop(schema);
    return result;
  }
  function CheckSchemaPushStack(stack, context, schema, value) {
    return context.Push() && CheckSchema(stack, context, schema, value) && context.Pop();
  }
  function CheckSchema(stack, context, schema, value) {
    stack.Push(schema);
    const result = IsSchemaBoolean(schema) ? CheckSchemaBoolean(stack, context, schema, value) : (!IsType(schema) || CheckType(stack, context, schema, value)) && (!(guard_exports.IsObject(value) && !guard_exports.IsArray(value)) || (!IsRequired(schema) || CheckRequired(stack, context, schema, value)) && (!IsAdditionalProperties(schema) || CheckAdditionalProperties(stack, context, schema, value)) && (!IsDependencies(schema) || CheckDependencies(stack, context, schema, value)) && (!IsDependentRequired(schema) || CheckDependentRequired(stack, context, schema, value)) && (!IsDependentSchemas(schema) || CheckDependentSchemas(stack, context, schema, value)) && (!IsPatternProperties(schema) || CheckPatternProperties(stack, context, schema, value)) && (!IsProperties(schema) || CheckProperties(stack, context, schema, value)) && (!IsPropertyNames(schema) || CheckPropertyNames(stack, context, schema, value)) && (!IsMinProperties(schema) || CheckMinProperties(stack, context, schema, value)) && (!IsMaxProperties(schema) || CheckMaxProperties(stack, context, schema, value))) && (!guard_exports.IsArray(value) || (!IsAdditionalItems(schema) || CheckAdditionalItems(stack, context, schema, value)) && (!IsContains(schema) || CheckContains(stack, context, schema, value)) && (!IsItems(schema) || CheckItems(stack, context, schema, value)) && (!IsMaxContains(schema) || CheckMaxContains(stack, context, schema, value)) && (!IsMaxItems(schema) || CheckMaxItems(stack, context, schema, value)) && (!IsMinContains(schema) || CheckMinContains(stack, context, schema, value)) && (!IsMinItems(schema) || CheckMinItems(stack, context, schema, value)) && (!IsPrefixItems(schema) || CheckPrefixItems(stack, context, schema, value)) && (!IsUniqueItems(schema) || CheckUniqueItems(stack, context, schema, value))) && (!guard_exports.IsString(value) || (!IsMaxLength4(schema) || CheckMaxLength(stack, context, schema, value)) && (!IsMinLength4(schema) || CheckMinLength(stack, context, schema, value)) && (!IsFormat(schema) || CheckFormat(stack, context, schema, value)) && (!IsPattern(schema) || CheckPattern(stack, context, schema, value))) && (!(guard_exports.IsNumber(value) || guard_exports.IsBigInt(value)) || (!IsExclusiveMaximum(schema) || CheckExclusiveMaximum(stack, context, schema, value)) && (!IsExclusiveMinimum(schema) || CheckExclusiveMinimum(stack, context, schema, value)) && (!IsMaximum(schema) || CheckMaximum(stack, context, schema, value)) && (!IsMinimum(schema) || CheckMinimum(stack, context, schema, value)) && (!IsMultipleOf2(schema) || CheckMultipleOf(stack, context, schema, value))) && (!IsRef2(schema) || CheckRef(stack, context, schema, value)) && (!IsRecursiveRef(schema) || CheckRecursiveRef(stack, context, schema, value)) && (!IsDynamicRef(schema) || CheckDynamicRef(stack, context, schema, value)) && (!IsConst(schema) || CheckConst(stack, context, schema, value)) && (!IsEnum2(schema) || CheckEnum(stack, context, schema, value)) && (!IsIf(schema) || CheckIf(stack, context, schema, value)) && (!IsNot(schema) || CheckNot(stack, context, schema, value)) && (!IsAllOf(schema) || CheckAllOf(stack, context, schema, value)) && (!IsAnyOf(schema) || CheckAnyOf(stack, context, schema, value)) && (!IsOneOf(schema) || CheckOneOf(stack, context, schema, value)) && (!IsUnevaluatedItems(schema) || (!guard_exports.IsArray(value) || CheckUnevaluatedItems(stack, context, schema, value))) && (!IsUnevaluatedProperties(schema) || (!guard_exports.IsObject(value) || CheckUnevaluatedProperties(stack, context, schema, value))) && (!IsRefine2(schema) || CheckRefine(stack, context, schema, value));
    stack.Pop(schema);
    return result;
  }
  function ErrorSchemaPushStack(stack, context, schemaPath, instancePath, schema, value) {
    return context.Push() && ErrorSchema(stack, context, schemaPath, instancePath, schema, value) && context.Pop();
  }
  function ErrorSchema(stack, context, schemaPath, instancePath, schema, value) {
    stack.Push(schema);
    const result = IsSchemaBoolean(schema) ? ErrorSchemaBoolean(stack, context, schemaPath, instancePath, schema, value) : !!(+(!IsType(schema) || ErrorType(stack, context, schemaPath, instancePath, schema, value)) & +(!(guard_exports.IsObject(value) && !guard_exports.IsArray(value)) || !!(+(!IsRequired(schema) || ErrorRequired(stack, context, schemaPath, instancePath, schema, value)) & +(!IsAdditionalProperties(schema) || ErrorAdditionalProperties(stack, context, schemaPath, instancePath, schema, value)) & +(!IsDependencies(schema) || ErrorDependencies(stack, context, schemaPath, instancePath, schema, value)) & +(!IsDependentRequired(schema) || ErrorDependentRequired(stack, context, schemaPath, instancePath, schema, value)) & +(!IsDependentSchemas(schema) || ErrorDependentSchemas(stack, context, schemaPath, instancePath, schema, value)) & +(!IsPatternProperties(schema) || ErrorPatternProperties(stack, context, schemaPath, instancePath, schema, value)) & +(!IsProperties(schema) || ErrorProperties(stack, context, schemaPath, instancePath, schema, value)) & +(!IsPropertyNames(schema) || ErrorPropertyNames(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMinProperties(schema) || ErrorMinProperties(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMaxProperties(schema) || ErrorMaxProperties(stack, context, schemaPath, instancePath, schema, value)))) & +(!guard_exports.IsArray(value) || !!(+(!IsAdditionalItems(schema) || ErrorAdditionalItems(stack, context, schemaPath, instancePath, schema, value)) & +(!IsContains(schema) || ErrorContains(stack, context, schemaPath, instancePath, schema, value)) & +(!IsItems(schema) || ErrorItems(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMaxContains(schema) || ErrorMaxContains(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMaxItems(schema) || ErrorMaxItems(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMinContains(schema) || ErrorMinContains(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMinItems(schema) || ErrorMinItems(stack, context, schemaPath, instancePath, schema, value)) & +(!IsPrefixItems(schema) || ErrorPrefixItems(stack, context, schemaPath, instancePath, schema, value)) & +(!IsUniqueItems(schema) || ErrorUniqueItems(stack, context, schemaPath, instancePath, schema, value)))) & +(!guard_exports.IsString(value) || !!(+(!IsMaxLength4(schema) || ErrorMaxLength(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMinLength4(schema) || ErrorMinLength(stack, context, schemaPath, instancePath, schema, value)) & +(!IsFormat(schema) || ErrorFormat(stack, context, schemaPath, instancePath, schema, value)) & +(!IsPattern(schema) || ErrorPattern(stack, context, schemaPath, instancePath, schema, value)))) & +(!(guard_exports.IsNumber(value) || guard_exports.IsBigInt(value)) || !!(+(!IsExclusiveMaximum(schema) || ErrorExclusiveMaximum(stack, context, schemaPath, instancePath, schema, value)) & +(!IsExclusiveMinimum(schema) || ErrorExclusiveMinimum(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMaximum(schema) || ErrorMaximum(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMinimum(schema) || ErrorMinimum(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMultipleOf2(schema) || ErrorMultipleOf(stack, context, schemaPath, instancePath, schema, value)))) & +(!IsRef2(schema) || ErrorRef(stack, context, schemaPath, instancePath, schema, value)) & +(!IsRecursiveRef(schema) || ErrorRecursiveRef(stack, context, schemaPath, instancePath, schema, value)) & +(!IsDynamicRef(schema) || ErrorDynamicRef(stack, context, schemaPath, instancePath, schema, value)) & +(!IsConst(schema) || ErrorConst(stack, context, schemaPath, instancePath, schema, value)) & +(!IsEnum2(schema) || ErrorEnum(stack, context, schemaPath, instancePath, schema, value)) & +(!IsIf(schema) || ErrorIf(stack, context, schemaPath, instancePath, schema, value)) & +(!IsNot(schema) || ErrorNot(stack, context, schemaPath, instancePath, schema, value)) & +(!IsAllOf(schema) || ErrorAllOf(stack, context, schemaPath, instancePath, schema, value)) & +(!IsAnyOf(schema) || ErrorAnyOf(stack, context, schemaPath, instancePath, schema, value)) & +(!IsOneOf(schema) || ErrorOneOf(stack, context, schemaPath, instancePath, schema, value)) & +(!IsUnevaluatedItems(schema) || (!guard_exports.IsArray(value) || ErrorUnevaluatedItems(stack, context, schemaPath, instancePath, schema, value))) & +(!IsUnevaluatedProperties(schema) || (!guard_exports.IsObject(value) || ErrorUnevaluatedProperties(stack, context, schemaPath, instancePath, schema, value)))) && (!IsRefine2(schema) || ErrorRefine(stack, context, schemaPath, instancePath, schema, value));
    stack.Pop(schema);
    return result;
  }

  // runtime/node_modules/typebox/build/schema/engine/_functions.mjs
  var index2 = [0];
  var names = /* @__PURE__ */ new Map();
  var funcs = /* @__PURE__ */ new Map();
  function NextName() {
    return hash_exports.Hash(index2[0]++);
  }
  function CreateName(schema, href) {
    if (!names.has(schema))
      names.set(schema, /* @__PURE__ */ new Map());
    const hrefs = names.get(schema);
    if (hrefs.has(href))
      return hrefs.get(href);
    const name = NextName();
    hrefs.set(href, name);
    return name;
  }
  function CreateCallExpression(context, _schema, name, value) {
    return context.UseUnevaluated() ? emit_exports.Call(`check_${name}`, ["context", value]) : emit_exports.Call(`check_${name}`, [value]);
  }
  function CreateFunctionExpression(stack, context, schema, name) {
    const expression = BuildSchema(stack, context, schema, "value");
    return context.UseUnevaluated() ? emit_exports.ConstDeclaration(`check_${name}`, emit_exports.ArrowFunction(["context", "value"], expression)) : emit_exports.ConstDeclaration(`check_${name}`, emit_exports.ArrowFunction(["value"], expression));
  }
  function ResetFunctions() {
    index2[0] = 0;
    names.clear();
    funcs.clear();
  }
  function GetFunctions() {
    return [...funcs.values()];
  }
  function CreateFunction(stack, context, schema, value) {
    const name = CreateName(schema, stack.BaseURL().href);
    const call2 = CreateCallExpression(context, schema, name, value);
    if (funcs.has(name))
      return call2;
    funcs.set(name, "");
    funcs.set(name, CreateFunctionExpression(stack, context, schema, name));
    return call2;
  }

  // runtime/node_modules/typebox/build/schema/resolve/resolve.mjs
  var resolve_exports = {};
  __export(resolve_exports, {
    DynamicRef: () => DynamicRef,
    Ref: () => Ref2
  });

  // runtime/node_modules/typebox/build/schema/pointer/pointer.mjs
  var pointer_exports = {};
  __export(pointer_exports, {
    Delete: () => Delete,
    Get: () => Get4,
    Has: () => Has2,
    Indices: () => Indices,
    Set: () => Set4
  });
  function AssertNotRoot(indices) {
    if (indices.length === 0)
      throw Error("Cannot set root");
  }
  function AssertCanSet(value) {
    if (!guard_exports.IsObject(value))
      throw Error("Cannot set value");
  }
  function AssertIndex(index3) {
    if (guard_exports.IsUnsafePropertyKey(index3))
      throw Error("Pointer contains unsafe property key");
  }
  function AssertIndices(indices) {
    for (const index3 of indices)
      AssertIndex(index3);
  }
  function IsNumericIndex(index3) {
    return /^(0|[1-9]\d*)$/.test(index3);
  }
  function TakeIndexRight(indices) {
    return [
      indices.slice(0, indices.length - 1),
      indices.slice(indices.length - 1)[0]
    ];
  }
  function HasIndex(index3, value) {
    return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, index3);
  }
  function GetIndex(index3, value) {
    return guard_exports.IsObject(value) && !guard_exports.IsUnsafePropertyKey(index3) ? value[index3] : void 0;
  }
  function GetIndices(indices, value) {
    return indices.reduce((value2, index3) => GetIndex(index3, value2), value);
  }
  function Indices(pointer) {
    if (guard_exports.IsEqual(pointer.length, 0))
      return [];
    const indices = pointer.split("/").map((index3) => index3.replace(/~1/g, "/").replace(/~0/g, "~"));
    return indices.length > 0 && indices[0] === "" ? indices.slice(1) : indices;
  }
  function Has2(value, pointer) {
    let current = value;
    return Indices(pointer).every((index3) => {
      if (!HasIndex(index3, current))
        return false;
      current = current[index3];
      return true;
    });
  }
  function Get4(value, pointer) {
    const indices = Indices(pointer);
    return GetIndices(indices, value);
  }
  function Set4(value, pointer, next) {
    const indices = Indices(pointer);
    AssertNotRoot(indices);
    AssertIndices(indices);
    const [head, index3] = TakeIndexRight(indices);
    const parent = GetIndices(head, value);
    AssertCanSet(parent);
    parent[index3] = next;
    return value;
  }
  function Delete(value, pointer) {
    const indices = Indices(pointer);
    AssertNotRoot(indices);
    AssertIndices(indices);
    const [head, index3] = TakeIndexRight(indices);
    const parent = GetIndices(head, value);
    AssertCanSet(parent);
    if (guard_exports.IsArray(parent) && IsNumericIndex(index3)) {
      parent.splice(+index3, 1);
    } else {
      delete parent[index3];
    }
    return value;
  }

  // runtime/node_modules/typebox/build/schema/resolve/ref.mjs
  function MatchId(schema, base, ref) {
    if (schema.$id === ref.hash)
      return schema;
    const absoluteId = new URL(schema.$id, base.href);
    const absoluteRef = new URL(ref.href, base.href);
    if (guard_exports.IsEqual(absoluteId.pathname, absoluteRef.pathname)) {
      return ref.hash.startsWith("#") ? MatchHash(schema, base, ref) : schema;
    }
    return void 0;
  }
  function MatchAnchor(schema, base, ref) {
    const absoluteAnchor = new URL(`#${schema.$anchor}`, base.href);
    const absoluteRef = new URL(ref.href, base.href);
    return guard_exports.IsEqual(absoluteAnchor.href, absoluteRef.href) ? schema : void 0;
  }
  function MatchDynamicAnchor(schema, base, ref) {
    const absoluteAnchor = new URL(`#${schema.$dynamicAnchor}`, base.href);
    const absoluteRef = new URL(ref.href, base.href);
    return guard_exports.IsEqual(absoluteAnchor.href, absoluteRef.href) ? schema : void 0;
  }
  function MatchHash(schema, _base, ref) {
    if (ref.href.endsWith("#"))
      return schema;
    if (!ref.hash.startsWith("#"))
      return void 0;
    const fragment = decodeURIComponent(ref.hash.slice(1));
    if (!fragment.startsWith("/"))
      return void 0;
    return pointer_exports.Get(schema, fragment);
  }
  function Match4(schema, base, ref) {
    if (IsId(schema)) {
      const result = MatchId(schema, base, ref);
      if (!guard_exports.IsUndefined(result))
        return result;
    }
    if (IsAnchor(schema)) {
      const result = MatchAnchor(schema, base, ref);
      if (!guard_exports.IsUndefined(result))
        return result;
    }
    if (IsDynamicAnchor(schema)) {
      const result = MatchDynamicAnchor(schema, base, ref);
      if (!guard_exports.IsUndefined(result))
        return result;
    }
    return MatchHash(schema, base, ref);
  }
  function FromArray6(schema, base, ref) {
    return schema.reduce((result, item) => {
      const match = FromValue3(item, base, ref);
      return !guard_exports.IsUndefined(match) ? match : result;
    }, void 0);
  }
  function FromObject10(schema, base, ref) {
    return guard_exports.Keys(schema).reduce((result, key) => {
      const match = FromValue3(schema[key], base, ref);
      return !guard_exports.IsUndefined(match) ? match : result;
    }, void 0);
  }
  function FromValue3(schema, base, ref) {
    const nextBase = IsSchemaObject(schema) && IsId(schema) ? new URL(schema.$id, base.href) : base;
    if (IsSchemaObject(schema)) {
      const result = Match4(schema, nextBase, ref);
      if (!guard_exports.IsUndefined(result))
        return result;
    }
    if (guard_exports.IsArray(schema))
      return FromArray6(schema, nextBase, ref);
    if (guard_exports.IsObject(schema))
      return FromObject10(schema, nextBase, ref);
    return void 0;
  }
  function Ref2(schema, ref) {
    const defaultBase = new URL("http://unknown/");
    const initialBase = IsId(schema) ? new URL(schema.$id, defaultBase.href) : defaultBase;
    const initialRef = new URL(ref, initialBase.href);
    return FromValue3(schema, initialBase, initialRef);
  }
  function DynamicRef(root, base, dynamicRef, dynamicAnchors) {
    const fragmentTarget = dynamicRef.$dynamicRef.startsWith("#") ? Ref2(base, dynamicRef.$dynamicRef) : Ref2(root, dynamicRef.$dynamicRef);
    if (guard_exports.IsUndefined(fragmentTarget))
      return void 0;
    if (!IsSchemaObject(fragmentTarget) || !IsDynamicAnchor(fragmentTarget))
      return fragmentTarget;
    const fragment = new URL(dynamicRef.$dynamicRef, "http://unknown/").hash;
    if (fragment.startsWith("#/"))
      return fragmentTarget;
    const anchorTarget = dynamicAnchors.find((anchor) => anchor.$dynamicAnchor === fragmentTarget.$dynamicAnchor);
    return anchorTarget ?? fragmentTarget;
  }

  // runtime/node_modules/typebox/build/schema/engine/_stack.mjs
  var __classPrivateFieldGet = function(receiver, state2, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state2 === "function" ? receiver !== state2 || !f : !state2.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state2.get(receiver);
  };
  var _Stack_instances;
  var _Stack_PushResourceAnchors;
  var _Stack_PopResourceAnchors;
  var _Stack_FromContext;
  var _Stack_FromRef;
  var Stack = class {
    constructor(context, schema) {
      _Stack_instances.add(this);
      this.context = context;
      this.schema = schema;
      this.ids = [];
      this.anchors = [];
      this.recursiveAnchors = [];
      this.dynamicAnchors = [];
    }
    // ----------------------------------------------------------------
    // Base
    // ----------------------------------------------------------------
    BaseURL() {
      return this.ids.reduce((result, schema) => new URL(schema.$id, result), new URL("http://unknown"));
    }
    Base() {
      return this.ids[this.ids.length - 1] ?? this.schema;
    }
    // ----------------------------------------------------------------
    // Stack
    // ----------------------------------------------------------------
    Push(schema) {
      if (!IsSchemaObject(schema))
        return;
      if (IsId(schema)) {
        this.ids.push(schema);
        __classPrivateFieldGet(this, _Stack_instances, "m", _Stack_PushResourceAnchors).call(this, schema);
      }
      if (IsAnchor(schema))
        this.anchors.push(schema);
      if (IsRecursiveAnchorTrue(schema))
        this.recursiveAnchors.push(schema);
      if (IsDynamicAnchor(schema))
        this.dynamicAnchors.push(schema);
    }
    Pop(schema) {
      if (!IsSchemaObject(schema))
        return;
      if (IsId(schema)) {
        this.ids.pop();
        __classPrivateFieldGet(this, _Stack_instances, "m", _Stack_PopResourceAnchors).call(this, schema);
      }
      if (IsAnchor(schema))
        this.anchors.pop();
      if (IsRecursiveAnchorTrue(schema))
        this.recursiveAnchors.pop();
      if (IsDynamicAnchor(schema))
        this.dynamicAnchors.pop();
    }
    Ref(ref) {
      return __classPrivateFieldGet(this, _Stack_instances, "m", _Stack_FromContext).call(this, ref) ?? __classPrivateFieldGet(this, _Stack_instances, "m", _Stack_FromRef).call(this, ref);
    }
    // ----------------------------------------------------------------
    // RecursiveRef
    // ----------------------------------------------------------------
    RecursiveRef(recursiveRef) {
      return IsRecursiveAnchorTrue(this.Base()) ? resolve_exports.Ref(this.recursiveAnchors[0], recursiveRef.$recursiveRef) : resolve_exports.Ref(this.Base(), recursiveRef.$recursiveRef);
    }
    // ----------------------------------------------------------------
    // DynamicRef
    // ----------------------------------------------------------------
    DynamicRef(dynamicRef) {
      const root = this.schema;
      return resolve_exports.DynamicRef(root, this.Base(), dynamicRef, this.dynamicAnchors);
    }
  };
  _Stack_instances = /* @__PURE__ */ new WeakSet(), _Stack_PushResourceAnchors = function _Stack_PushResourceAnchors2(schema, isRoot = true) {
    if (!IsSchemaObject(schema))
      return;
    const current = schema;
    if (!isRoot && IsId(current))
      return;
    if (!isRoot && IsDynamicAnchor(current))
      this.dynamicAnchors.push(current);
    for (const key of guard_exports.Keys(current))
      __classPrivateFieldGet(this, _Stack_instances, "m", _Stack_PushResourceAnchors2).call(this, current[key], false);
  }, _Stack_PopResourceAnchors = function _Stack_PopResourceAnchors2(schema, isRoot = true) {
    if (!IsSchemaObject(schema))
      return;
    const current = schema;
    if (!isRoot && IsId(current))
      return;
    if (!isRoot && IsDynamicAnchor(current))
      this.dynamicAnchors.pop();
    for (const key of guard_exports.Keys(current))
      __classPrivateFieldGet(this, _Stack_instances, "m", _Stack_PopResourceAnchors2).call(this, current[key], false);
  }, _Stack_FromContext = function _Stack_FromContext2(ref) {
    return guard_exports.HasPropertyKey(this.context, ref.$ref) ? this.context[ref.$ref] : void 0;
  }, _Stack_FromRef = function _Stack_FromRef2(ref) {
    const root = this.schema;
    return !ref.$ref.startsWith("#") ? resolve_exports.Ref(root, ref.$ref) : resolve_exports.Ref(this.Base(), ref.$ref);
  };

  // runtime/node_modules/typebox/build/schema/build.mjs
  function CreateCode(build) {
    const functions = build.Functions().join(";\n");
    const statements = build.UseUnevaluated() ? ["const context = new CheckContext({}, {})", `return ${build.Entry()}`] : [`return ${build.Entry()}`];
    return `${functions}; return (value) => { ${statements.join("; ")} }`;
  }
  function CreateEvaluatedCheck(build, code) {
    const factory = environment_exports.Evaluate("CheckContext", "Guard", "Format", "Hashing", build.External().identifier, code);
    return factory(CheckContext, guard_exports, format_exports, hash_exports, build.External().variables);
  }
  function CreateDynamicCheck(build) {
    const stack = new Stack(build.Context(), build.Schema());
    const context = new CheckContext();
    return (value) => CheckSchema(stack, context, build.Schema(), value);
  }
  function CreateCheck(build, code) {
    return environment_exports.CanEvaluate() ? CreateEvaluatedCheck(build, code) : CreateDynamicCheck(build);
  }
  var EvaluateResult = class {
    constructor(isAccelerated, code, check) {
      this.isAccelerated = isAccelerated;
      this.code = code;
      this.check = check;
    }
    IsAccelerated() {
      return this.isAccelerated;
    }
    Code() {
      return this.code;
    }
    Check(value) {
      return this.check(value);
    }
  };
  var BuildResult = class {
    constructor(context, schema, external, functions, entry, useUnevaluated) {
      this.context = context;
      this.schema = schema;
      this.external = external;
      this.functions = functions;
      this.entry = entry;
      this.useUnevaluated = useUnevaluated;
    }
    /** Returns the Context used for this build */
    Context() {
      return this.context;
    }
    /** Returns the Schema used for this build */
    Schema() {
      return this.schema;
    }
    /** Returns true if this build requires a Unevaluated context */
    UseUnevaluated() {
      return this.useUnevaluated;
    }
    /** Returns external variables */
    External() {
      return this.external;
    }
    /** Returns check functions */
    Functions() {
      return this.functions;
    }
    /** Return entry function call. */
    Entry() {
      return this.entry;
    }
    /** Evaluates the build into a validation function */
    Evaluate() {
      const code = CreateCode(this);
      const check = CreateCheck(this, code);
      return new EvaluateResult(environment_exports.CanEvaluate(), code, check);
    }
  };
  function Build(...args) {
    const [context, schema] = arguments_exports.Match(args, {
      2: (context2, schema2) => [context2, schema2],
      1: (schema2) => [{}, schema2]
    });
    ResetExternal();
    ResetFunctions();
    const stack = new Stack(context, schema);
    const build = new BuildContext(HasUnevaluated(context, schema));
    const call2 = CreateFunction(stack, build, schema, "value");
    const functions = GetFunctions();
    const externals = GetExternal();
    return new BuildResult(context, schema, externals, functions, call2, build.UseUnevaluated());
  }

  // runtime/node_modules/typebox/build/schema/errors.mjs
  function Errors(...args) {
    const [context, schema, value] = arguments_exports.Match(args, {
      3: (context2, schema2, value2) => [context2, schema2, value2],
      2: (schema2, value2) => [{}, schema2, value2]
    });
    const settings2 = settings_exports.Get();
    const locale2 = Get2();
    const errors = [];
    const stack = new Stack(context, schema);
    const errorContext = new ErrorContext((error) => {
      if (guard_exports.IsGreaterEqualThan(errors.length, settings2.maxErrors))
        return;
      return errors.push({ ...error, message: locale2(error) });
    });
    const result = ErrorSchema(stack, errorContext, "#", "", schema, value);
    return [result, errors];
  }

  // runtime/node_modules/typebox/build/schema/check.mjs
  function Check(...args) {
    const [context, schema, value] = arguments_exports.Match(args, {
      3: (context2, schema2, value2) => [context2, schema2, value2],
      2: (schema2, value2) => [{}, schema2, value2]
    });
    const stack = new Stack(context, schema);
    const checkContext = new CheckContext();
    return CheckSchema(stack, checkContext, schema, value);
  }

  // runtime/node_modules/typebox/build/value/check/check.mjs
  function Check2(...args) {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    return Check(context, type, value);
  }

  // runtime/node_modules/typebox/build/value/errors/errors.mjs
  function Errors2(...args) {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    const [_, errors] = Errors(context, type, value);
    return errors;
  }

  // runtime/node_modules/typebox/build/value/assert/assert.mjs
  var AssertError = class extends Error {
    constructor(source, value, errors) {
      super(source);
      Object.defineProperty(this, "cause", {
        value: { source, errors, value },
        writable: false,
        configurable: false,
        enumerable: false
      });
    }
  };
  function Assert(...args) {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    const check = Check2(context, type, value);
    if (!check)
      throw new AssertError("Assert", value, Errors2(context, type, value));
  }

  // runtime/node_modules/typebox/build/value/clean/from_array.mjs
  function FromArray7(context, type, value) {
    if (!guard_exports.IsArray(value))
      return value;
    return value.map((value2) => FromType19(context, type.items, value2));
  }

  // runtime/node_modules/typebox/build/value/clean/from_cyclic.mjs
  function FromCyclic6(context, type, value) {
    return FromType19({ ...context, ...type.$defs }, Ref(type.$ref), value);
  }

  // runtime/node_modules/typebox/build/value/clean/from_intersect.mjs
  function EvaluateIntersection(context, type) {
    const additionalProperties = guard_exports.HasPropertyKey(type, "unevaluatedProperties") ? { additionalProperties: type.unevaluatedProperties } : {};
    const instantiated = Instantiate(context, type);
    const evaluated = Evaluate2(instantiated);
    return IsObject3(evaluated) ? With2(evaluated, additionalProperties) : evaluated;
  }
  function FromIntersect6(context, type, value) {
    const evaluated = EvaluateIntersection(context, type);
    return FromType19(context, evaluated, value);
  }

  // runtime/node_modules/typebox/build/value/clean/additional.mjs
  function GetAdditionalProperties(type) {
    const additionalProperties = guard_exports.HasPropertyKey(type, "additionalProperties") ? type.additionalProperties : void 0;
    return additionalProperties;
  }

  // runtime/node_modules/typebox/build/value/clean/from_object.mjs
  function FromObject11(context, type, value) {
    if (!guard_exports.IsObject(value) || guard_exports.IsArray(value))
      return value;
    const additionalProperties = GetAdditionalProperties(type);
    for (const key of guard_exports.Keys(value)) {
      if (guard_exports.HasPropertyKey(type.properties, key)) {
        value[key] = FromType19(context, type.properties[key], value[key]);
        continue;
      }
      const unknownCheck = (
        // 1. additionalProperties: true
        guard_exports.IsBoolean(additionalProperties) && guard_exports.IsEqual(additionalProperties, true) || IsSchema(additionalProperties) && Check2(context, additionalProperties, value[key])
      );
      if (unknownCheck) {
        value[key] = FromType19(context, additionalProperties, value[key]);
        continue;
      }
      delete value[key];
    }
    return value;
  }

  // runtime/node_modules/typebox/build/value/clean/from_record.mjs
  function FromRecord3(context, type, value) {
    if (!guard_exports.IsObject(value))
      return value;
    const additionalProperties = GetAdditionalProperties(type);
    const [recordPattern, recordValue] = [new RegExp(RecordPattern(type)), RecordValue(type)];
    for (const key of guard_exports.Keys(value)) {
      if (recordPattern.test(key)) {
        value[key] = FromType19(context, recordValue, value[key]);
        continue;
      }
      const unknownCheck = (
        // 1. additionalProperties: true
        guard_exports.IsBoolean(additionalProperties) && guard_exports.IsEqual(additionalProperties, true) || IsSchema(additionalProperties) && Check2(context, additionalProperties, value[key])
      );
      if (unknownCheck) {
        value[key] = FromType19(context, additionalProperties, value[key]);
        continue;
      }
      delete value[key];
    }
    return value;
  }

  // runtime/node_modules/typebox/build/value/clean/from_ref.mjs
  function FromRef5(context, type, value) {
    return guard_exports.HasPropertyKey(context, type.$ref) ? FromType19(context, context[type.$ref], value) : value;
  }

  // runtime/node_modules/typebox/build/value/clean/from_tuple.mjs
  function FromTuple5(context, schema, value) {
    if (!guard_exports.IsArray(value))
      return value;
    const length = Math.min(value.length, schema.items.length);
    for (let index3 = 0; index3 < length; index3++) {
      value[index3] = FromType19(context, schema.items[index3], value[index3]);
    }
    return guard_exports.IsGreaterThan(value.length, length) ? value.slice(0, length) : value;
  }

  // runtime/node_modules/typebox/build/value/clone/clone.mjs
  function Clone2(value) {
    return Clone(value);
  }

  // runtime/node_modules/typebox/build/value/clean/from_union.mjs
  function FromUnion9(context, type, value) {
    for (const schema of type.anyOf) {
      const clean = FromType19(context, schema, Clone2(value));
      if (Check2(context, schema, clean))
        return clean;
    }
    return value;
  }

  // runtime/node_modules/typebox/build/value/clean/from_type.mjs
  function FromType19(context, type, value) {
    return IsArray3(type) ? FromArray7(context, type, value) : IsCyclic(type) ? FromCyclic6(context, type, value) : IsIntersect(type) ? FromIntersect6(context, type, value) : IsObject3(type) ? FromObject11(context, type, value) : IsRecord(type) ? FromRecord3(context, type, value) : IsRef(type) ? FromRef5(context, type, value) : IsTuple(type) ? FromTuple5(context, type, value) : IsUnion(type) ? FromUnion9(context, type, value) : value;
  }

  // runtime/node_modules/typebox/build/value/shared/union_priority_sort.mjs
  function Modifiers(type, next) {
    for (const key of guard_default.Keys(type)) {
      if (guard_default.HasPropertyKey(next, key))
        continue;
      next[key] = type[key];
    }
    return next;
  }
  function FromProperties4(properties) {
    const result = {};
    for (const key of guard_default.Keys(properties))
      result[key] = FromType20(properties[key]);
    return result;
  }
  function FromPriorityTypes(types) {
    return FromTypes6(Priority(types));
  }
  function FromTypes6(types) {
    return types.map((type) => FromType20(type));
  }
  function FromType20(type) {
    const next = IsArray3(type) ? _Array_(FromType20(type.items), ArrayOptions(type)) : IsIntersect(type) ? Intersect(FromTypes6(type.allOf)) : IsUnion(type) ? Union(FromPriorityTypes(type.anyOf)) : IsObject3(type) ? _Object_(FromProperties4(type.properties)) : IsRecord(type) ? Record(RecordKey(type), FromType20(RecordValue(type))) : IsTuple(type) ? Tuple(FromTypes6(type.items)) : type;
    return Modifiers(type, next);
  }
  function UnionPrioritySort(type) {
    const result = FromType20(type);
    return result;
  }

  // runtime/node_modules/typebox/build/value/clean/clean.mjs
  function Clean(...args) {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    const sorted = settings_exports.Get().unionPrioritySort ? UnionPrioritySort(type) : type;
    return FromType19(context, sorted, value);
  }

  // runtime/node_modules/typebox/build/value/convert/try/try.mjs
  var try_exports = {};
  __export(try_exports, {
    Fail: () => Fail,
    IsOk: () => IsOk,
    Ok: () => Ok,
    TryArray: () => TryArray,
    TryBigInt: () => TryBigInt,
    TryBoolean: () => TryBoolean,
    TryNull: () => TryNull,
    TryNumber: () => TryNumber,
    TryString: () => TryString,
    TryUndefined: () => TryUndefined
  });

  // runtime/node_modules/typebox/build/value/convert/try/try_result.mjs
  function IsOk(value) {
    return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "value");
  }
  function Ok(value) {
    return { value };
  }
  function Fail() {
    return void 0;
  }

  // runtime/node_modules/typebox/build/value/convert/try/try_array.mjs
  function TryArray(value) {
    return guard_exports.IsArray(value) ? Ok(value) : Ok([value]);
  }

  // runtime/node_modules/typebox/build/value/convert/try/try_bigint.mjs
  function FromBoolean2(value) {
    return guard_exports.IsEqual(value, true) ? Ok(BigInt(1)) : Ok(BigInt(0));
  }
  var bigintPattern = /^-?(0|[1-9]\d*)n$/;
  var decimalPattern = /^-?(0|[1-9]\d*)\.\d+$/;
  var integerPattern = /^-?(0|[1-9]\d*)$/;
  function IsStringBigIntLike(value) {
    return bigintPattern.test(value);
  }
  function IsStringDecimalLike(value) {
    return decimalPattern.test(value);
  }
  function IsStringIntegerLike(value) {
    return integerPattern.test(value);
  }
  function FromString2(value) {
    const lowercase = value.toLowerCase();
    return IsStringBigIntLike(value) ? Ok(BigInt(value.slice(0, value.length - 1))) : IsStringDecimalLike(value) ? Ok(BigInt(value.split(".")[0])) : IsStringIntegerLike(value) ? Ok(BigInt(value)) : guard_exports.IsEqual(lowercase, "false") ? Ok(BigInt(0)) : guard_exports.IsEqual(lowercase, "true") ? Ok(BigInt(1)) : Fail();
  }
  function TryBigInt(value) {
    return guard_exports.IsBigInt(value) ? Ok(value) : guard_exports.IsBoolean(value) ? FromBoolean2(value) : guard_exports.IsNumber(value) ? Ok(BigInt(Math.trunc(value))) : guard_exports.IsNull(value) ? Ok(BigInt(0)) : guard_exports.IsString(value) ? FromString2(value) : guard_exports.IsUndefined(value) ? Ok(BigInt(0)) : Fail();
  }

  // runtime/node_modules/typebox/build/value/convert/try/try_boolean.mjs
  function FromBigInt2(value) {
    return guard_exports.IsEqual(value, BigInt(0)) ? Ok(false) : guard_exports.IsEqual(value, BigInt(1)) ? Ok(true) : Fail();
  }
  function FromNumber2(value) {
    return guard_exports.IsEqual(value, 0) ? Ok(false) : guard_exports.IsEqual(value, 1) ? Ok(true) : Fail();
  }
  function FromString3(value) {
    return guard_exports.IsEqual(value.toLowerCase(), "false") ? Ok(false) : guard_exports.IsEqual(value.toLowerCase(), "true") ? Ok(true) : guard_exports.IsEqual(value, "0") ? Ok(false) : guard_exports.IsEqual(value, "1") ? Ok(true) : Fail();
  }
  function TryBoolean(value) {
    return guard_exports.IsBigInt(value) ? FromBigInt2(value) : guard_exports.IsBoolean(value) ? Ok(value) : guard_exports.IsNumber(value) ? FromNumber2(value) : guard_exports.IsNull(value) ? Ok(false) : guard_exports.IsString(value) ? FromString3(value) : guard_exports.IsUndefined(value) ? Ok(false) : Fail();
  }

  // runtime/node_modules/typebox/build/value/convert/try/try_null.mjs
  function FromBigInt3(value) {
    return guard_exports.IsEqual(value, BigInt(0)) ? Ok(null) : Fail();
  }
  function FromBoolean3(value) {
    return guard_exports.IsEqual(value, false) ? Ok(null) : Fail();
  }
  function FromNumber3(value) {
    return guard_exports.IsEqual(value, 0) ? Ok(null) : Fail();
  }
  function FromString4(value) {
    const lowercase = value.toLowerCase();
    const predicate = guard_exports.IsEqual(lowercase, "undefined") || guard_exports.IsEqual(lowercase, "null") || guard_exports.IsEqual(value, "") || guard_exports.IsEqual(value, "0");
    return predicate ? Ok(null) : Fail();
  }
  function TryNull(value) {
    return guard_exports.IsBigInt(value) ? FromBigInt3(value) : guard_exports.IsBoolean(value) ? FromBoolean3(value) : guard_exports.IsNumber(value) ? FromNumber3(value) : guard_exports.IsNull(value) ? Ok(null) : guard_exports.IsString(value) ? FromString4(value) : guard_exports.IsUndefined(value) ? Ok(null) : Fail();
  }

  // runtime/node_modules/typebox/build/value/convert/try/try_number.mjs
  var maxBigInt = BigInt(Number.MAX_SAFE_INTEGER);
  var minBigInt = BigInt(Number.MIN_SAFE_INTEGER);
  function FromBigInt4(value) {
    return value <= maxBigInt && value >= minBigInt ? Ok(Number(value)) : Fail();
  }
  function FromBoolean4(value) {
    return Ok(value ? 1 : 0);
  }
  function FromString5(value) {
    const coerced = +value;
    if (guard_exports.IsNumber(coerced))
      return Ok(coerced);
    const lowercase = value.toLowerCase();
    if (guard_exports.IsEqual(lowercase, "false"))
      return Ok(0);
    if (guard_exports.IsEqual(lowercase, "true"))
      return Ok(1);
    const result = TryBigInt(value);
    if (IsOk(result))
      return result.value <= maxBigInt && result.value >= minBigInt ? Ok(Number(result.value)) : Fail();
    return Fail();
  }
  function TryNumber(value) {
    return guard_exports.IsBigInt(value) ? FromBigInt4(value) : guard_exports.IsBoolean(value) ? FromBoolean4(value) : guard_exports.IsNumber(value) ? Ok(value) : guard_exports.IsNull(value) ? Ok(0) : guard_exports.IsString(value) ? FromString5(value) : guard_exports.IsUndefined(value) ? Ok(0) : Fail();
  }

  // runtime/node_modules/typebox/build/value/convert/try/try_string.mjs
  function TryString(value) {
    return guard_exports.IsBigInt(value) ? Ok(value.toString()) : guard_exports.IsBoolean(value) ? Ok(value.toString()) : guard_exports.IsNumber(value) ? Ok(value.toString()) : guard_exports.IsNull(value) ? Ok("null") : guard_exports.IsString(value) ? Ok(value) : guard_exports.IsUndefined(value) ? Ok("") : Fail();
  }

  // runtime/node_modules/typebox/build/value/convert/try/try_undefined.mjs
  function FromBigInt5(value) {
    return guard_exports.IsEqual(value, BigInt(0)) ? Ok(void 0) : Fail();
  }
  function FromBoolean5(value) {
    return guard_exports.IsEqual(value, false) ? Ok(void 0) : Fail();
  }
  function FromNumber4(value) {
    return guard_exports.IsEqual(value, 0) ? Ok(void 0) : Fail();
  }
  function FromString6(value) {
    const lowercase = value.toLowerCase();
    const predicate = guard_exports.IsEqual(lowercase, "undefined") || guard_exports.IsEqual(lowercase, "null") || guard_exports.IsEqual(value, "") || guard_exports.IsEqual(value, "0");
    return predicate ? Ok(void 0) : Fail();
  }
  function TryUndefined(value) {
    return guard_exports.IsBigInt(value) ? FromBigInt5(value) : guard_exports.IsBoolean(value) ? FromBoolean5(value) : guard_exports.IsNumber(value) ? FromNumber4(value) : guard_exports.IsNull(value) ? Ok(void 0) : guard_exports.IsString(value) ? FromString6(value) : guard_exports.IsUndefined(value) ? Ok(value) : Fail();
  }

  // runtime/node_modules/typebox/build/value/convert/from_array.mjs
  function FromArray8(context, type, value) {
    const result = try_exports.TryArray(value);
    return result.value.map((value2) => FromType21(context, type.items, value2));
  }

  // runtime/node_modules/typebox/build/value/convert/from_bigint.mjs
  function FromBigInt6(_context, _type, value) {
    const result = try_exports.TryBigInt(value);
    return try_exports.IsOk(result) ? result.value : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_boolean.mjs
  function FromBoolean6(_context, _type, value) {
    const result = try_exports.TryBoolean(value);
    return try_exports.IsOk(result) ? result.value : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_cyclic.mjs
  function FromCyclic7(context, type, value) {
    return FromType21({ ...context, ...type.$defs }, Ref(type.$ref), value);
  }

  // runtime/node_modules/typebox/build/value/convert/from_enum.mjs
  function FromEnum3(context, type, value) {
    return FromType21(context, Evaluate2(type), value);
  }

  // runtime/node_modules/typebox/build/value/convert/from_integer.mjs
  function FromInteger(_context, _type, value) {
    const result = try_exports.TryNumber(value);
    return try_exports.IsOk(result) ? Math.trunc(result.value) : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_intersect.mjs
  function FromIntersect7(context, type, value) {
    const instantiated = Instantiate(context, type);
    const evaluated = Evaluate2(instantiated);
    return FromType21(context, evaluated, value);
  }

  // runtime/node_modules/typebox/build/value/convert/from_literal.mjs
  function FromLiteralBigInt(_context, type, value) {
    const result = try_exports.TryBigInt(value);
    return try_exports.IsOk(result) && guard_exports.IsEqual(type.const, result.value) ? result.value : value;
  }
  function FromLiteralBoolean(_context, type, value) {
    const result = try_exports.TryBoolean(value);
    return try_exports.IsOk(result) && guard_exports.IsEqual(type.const, result.value) ? result.value : value;
  }
  function FromLiteralNumber(_context, type, value) {
    const result = try_exports.TryNumber(value);
    return try_exports.IsOk(result) && guard_exports.IsEqual(type.const, result.value) ? result.value : value;
  }
  function FromLiteralString(_context, type, value) {
    const result = try_exports.TryString(value);
    return try_exports.IsOk(result) && guard_exports.IsEqual(type.const, result.value) ? result.value : value;
  }
  function FromLiteral6(context, type, value) {
    if (guard_exports.IsEqual(type.const, value))
      return value;
    return IsLiteralBigInt(type) ? FromLiteralBigInt(context, type, value) : IsLiteralBoolean(type) ? FromLiteralBoolean(context, type, value) : IsLiteralNumber(type) ? FromLiteralNumber(context, type, value) : IsLiteralString(type) ? FromLiteralString(context, type, value) : Unreachable();
  }

  // runtime/node_modules/typebox/build/value/convert/from_null.mjs
  function FromNull2(_context, _type, value) {
    const result = try_exports.TryNull(value);
    return try_exports.IsOk(result) ? result.value : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_number.mjs
  function FromNumber5(_context, _type, value) {
    const result = try_exports.TryNumber(value);
    return try_exports.IsOk(result) ? result.value : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_additional.mjs
  function FromAdditionalProperties(context, entries, additionalProperties, value) {
    const keys = guard_exports.Keys(value);
    for (const [regexp, _] of entries) {
      for (const key of keys) {
        if (!regexp.test(key)) {
          value[key] = FromType21(context, additionalProperties, value[key]);
        }
      }
    }
    return value;
  }

  // runtime/node_modules/typebox/build/value/shared/optional_undefined.mjs
  function IsOptionalUndefined(property, key, value) {
    return IsOptional(property) && guard_exports.IsUndefined(value[key]);
  }

  // runtime/node_modules/typebox/build/value/convert/from_object.mjs
  function FromProperties5(context, type, value) {
    const entries = guard_exports.EntriesRegExp(type.properties);
    const keys = guard_exports.Keys(value);
    for (const [regexp, property] of entries) {
      for (const key of keys) {
        if (!regexp.test(key) || IsOptionalUndefined(property, key, value))
          continue;
        value[key] = FromType21(context, property, value[key]);
      }
    }
    return guard_exports.HasPropertyKey(type, "additionalProperties") && guard_exports.IsObject(type.additionalProperties) ? FromAdditionalProperties(context, entries, type.additionalProperties, value) : value;
  }
  function FromObject12(context, type, value) {
    return guard_exports.IsObjectNotArray(value) ? FromProperties5(context, type, value) : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_record.mjs
  function FromPatternProperties(context, type, value) {
    const entries = guard_exports.EntriesRegExp(type.patternProperties);
    const keys = guard_exports.Keys(value);
    for (const [regexp, schema] of entries) {
      for (const key of keys) {
        if (regexp.test(key)) {
          value[key] = FromType21(context, schema, value[key]);
        }
      }
    }
    return guard_exports.HasPropertyKey(type, "additionalProperties") && guard_exports.IsObject(type.additionalProperties) ? FromAdditionalProperties(context, entries, type.additionalProperties, value) : value;
  }
  function FromRecord4(context, type, value) {
    return guard_exports.IsObjectNotArray(value) ? FromPatternProperties(context, type, value) : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_ref.mjs
  function FromRef6(context, type, value) {
    return guard_exports.HasPropertyKey(context, type.$ref) ? FromType21(context, context[type.$ref], value) : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_string.mjs
  function FromString7(_context, _type, value) {
    const result = try_exports.TryString(value);
    return try_exports.IsOk(result) ? result.value : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_template_literal.mjs
  function FromTemplateLiteral4(context, type, value) {
    return FromType21(context, Evaluate2(type), value);
  }

  // runtime/node_modules/typebox/build/value/convert/from_tuple.mjs
  function FromTuple6(context, type, value) {
    if (!guard_exports.IsArray(value))
      return value;
    for (let index3 = 0; index3 < Math.min(type.items.length, value.length); index3++) {
      value[index3] = FromType21(context, type.items[index3], value[index3]);
    }
    return value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_undefined.mjs
  function FromUndefined2(_context, _type, value) {
    const result = try_exports.TryUndefined(value);
    return try_exports.IsOk(result) ? result.value : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_union.mjs
  function FromUnion10(context, type, value) {
    const matched = type.anyOf.some((type2) => Check2(context, type2, value));
    if (matched)
      return value;
    const candidates = type.anyOf.map((type2) => FromType21(context, type2, Clone2(value)));
    const selected = candidates.find((value2) => Check2(context, type, value2));
    return guard_exports.IsUndefined(selected) ? value : selected;
  }

  // runtime/node_modules/typebox/build/value/convert/from_void.mjs
  function FromVoid(_context, _type, value) {
    const result = try_exports.TryUndefined(value);
    return try_exports.IsOk(result) ? void 0 : value;
  }

  // runtime/node_modules/typebox/build/value/convert/from_type.mjs
  function FromType21(context, type, value) {
    return IsArray3(type) ? FromArray8(context, type, value) : IsBigInt3(type) ? FromBigInt6(context, type, value) : IsBoolean4(type) ? FromBoolean6(context, type, value) : IsCyclic(type) ? FromCyclic7(context, type, value) : IsEnum(type) ? FromEnum3(context, type, value) : IsInteger3(type) ? FromInteger(context, type, value) : IsIntersect(type) ? FromIntersect7(context, type, value) : IsLiteral(type) ? FromLiteral6(context, type, value) : IsNull3(type) ? FromNull2(context, type, value) : IsNumber4(type) ? FromNumber5(context, type, value) : IsObject3(type) ? FromObject12(context, type, value) : IsRecord(type) ? FromRecord4(context, type, value) : IsRef(type) ? FromRef6(context, type, value) : IsString4(type) ? FromString7(context, type, value) : IsTemplateLiteral(type) ? FromTemplateLiteral4(context, type, value) : IsTuple(type) ? FromTuple6(context, type, value) : IsUndefined3(type) ? FromUndefined2(context, type, value) : IsUnion(type) ? FromUnion10(context, type, value) : IsVoid(type) ? FromVoid(context, type, value) : value;
  }

  // runtime/node_modules/typebox/build/value/convert/convert.mjs
  function Convert(...args) {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    return FromType21(context, type, value);
  }

  // runtime/node_modules/typebox/build/value/default/from_array.mjs
  function FromArray9(context, type, value) {
    if (!guard_exports.IsArray(value))
      return value;
    for (let i = 0; i < value.length; i++) {
      value[i] = FromType22(context, type.items, value[i]);
    }
    return value;
  }

  // runtime/node_modules/typebox/build/value/default/from_cyclic.mjs
  function FromCyclic8(context, type, value) {
    return FromType22({ ...context, ...type.$defs }, Ref(type.$ref), value);
  }

  // runtime/node_modules/typebox/build/value/default/from_default.mjs
  function FromDefault(type, value) {
    if (!guard_exports.IsUndefined(value))
      return value;
    return guard_exports.IsFunction(type.default) ? type.default() : Clone2(type.default);
  }

  // runtime/node_modules/typebox/build/value/default/from_intersect.mjs
  function FromIntersect8(context, type, value) {
    const instantiated = Instantiate(context, type);
    const evaluated = Evaluate2(instantiated);
    return FromType22(context, evaluated, value);
  }

  // runtime/node_modules/typebox/build/value/default/from_object.mjs
  function FromObject13(context, type, value) {
    if (!guard_exports.IsObject(value))
      return value;
    const knownPropertyKeys = guard_exports.Keys(type.properties);
    for (const key of knownPropertyKeys) {
      const propertyValue = FromType22(context, type.properties[key], value[key]);
      const isUnassignableUndefined = guard_exports.IsUndefined(propertyValue) && (IsOptional(type.properties[key]) || !guard_exports.HasPropertyKey(type.properties[key], "default"));
      if (isUnassignableUndefined)
        continue;
      value[key] = propertyValue;
    }
    if (!IsAdditionalProperties(type) || guard_exports.IsBoolean(type.additionalProperties))
      return value;
    for (const key of guard_exports.Keys(value)) {
      if (knownPropertyKeys.includes(key))
        continue;
      value[key] = FromType22(context, type.additionalProperties, value[key]);
    }
    return value;
  }

  // runtime/node_modules/typebox/build/value/default/from_record.mjs
  function FromRecord5(context, type, value) {
    if (!guard_exports.IsObject(value))
      return value;
    const [recordKey, recordValue] = [new RegExp(RecordPattern(type)), RecordValue(type)];
    for (const key of guard_exports.Keys(value)) {
      if (!(recordKey.test(key) && IsDefault(recordValue)))
        continue;
      value[key] = FromType22(context, recordValue, value[key]);
    }
    if (!IsAdditionalProperties(type))
      return value;
    for (const key of guard_exports.Keys(value)) {
      if (recordKey.test(key))
        continue;
      value[key] = FromType22(context, type.additionalProperties, value[key]);
    }
    return value;
  }

  // runtime/node_modules/typebox/build/value/default/from_ref.mjs
  function FromRef7(context, type, value) {
    return guard_exports.HasPropertyKey(context, type.$ref) ? FromType22(context, context[type.$ref], value) : value;
  }

  // runtime/node_modules/typebox/build/value/default/from_tuple.mjs
  function FromTuple7(context, schema, value) {
    if (!guard_exports.IsArray(value))
      return value;
    const [items, max] = [schema.items, Math.max(schema.items.length, value.length)];
    for (let i = 0; i < max; i++) {
      if (i < items.length)
        value[i] = FromType22(context, items[i], value[i]);
    }
    return value;
  }

  // runtime/node_modules/typebox/build/value/default/from_union.mjs
  function FromUnion11(context, schema, value) {
    for (const inner of schema.anyOf) {
      const result = FromType22(context, inner, Clone2(value));
      if (Check2(context, inner, result)) {
        return result;
      }
    }
    return value;
  }

  // runtime/node_modules/typebox/build/value/default/from_type.mjs
  function FromType22(context, type, value) {
    const defaulted = IsDefault(type) ? FromDefault(type, value) : value;
    return IsArray3(type) ? FromArray9(context, type, defaulted) : IsCyclic(type) ? FromCyclic8(context, type, defaulted) : IsIntersect(type) ? FromIntersect8(context, type, defaulted) : IsObject3(type) ? FromObject13(context, type, defaulted) : IsRecord(type) ? FromRecord5(context, type, defaulted) : IsRef(type) ? FromRef7(context, type, defaulted) : IsTuple(type) ? FromTuple7(context, type, defaulted) : IsUnion(type) ? FromUnion11(context, type, defaulted) : defaulted;
  }

  // runtime/node_modules/typebox/build/value/default/default.mjs
  function Default(...args) {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    return FromType22(context, type, value);
  }

  // runtime/node_modules/typebox/build/value/pipeline/pipeline.mjs
  function Pipeline(pipeline) {
    return (...args) => {
      const [context, type, value] = arguments_exports.Match(args, {
        3: (context2, type2, value2) => [context2, type2, value2],
        2: (type2, value2) => [{}, type2, value2]
      });
      return pipeline.reduce((result, func) => func(context, type, result), value);
    };
  }

  // runtime/node_modules/typebox/build/value/codec/callback.mjs
  function Decode3(_context, type, value) {
    return type["~codec"].decode(value);
  }
  function Encode2(_context, type, value) {
    return type["~codec"].encode(value);
  }
  function Callback(direction, context, type, value) {
    if (!IsCodec(type))
      return value;
    return guard_exports.IsEqual(direction, "Decode") ? Decode3(context, type, value) : Encode2(context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/from_array.mjs
  function Decode4(direction, context, type, value) {
    if (!guard_exports.IsArray(value))
      return value;
    for (let i = 0; i < value.length; i++) {
      value[i] = FromType23(direction, context, type.items, value[i]);
    }
    return Callback(direction, context, type, value);
  }
  function Encode3(direction, context, type, value) {
    const exterior = Callback(direction, context, type, value);
    if (!guard_exports.IsArray(exterior))
      return exterior;
    for (let i = 0; i < exterior.length; i++) {
      exterior[i] = FromType23(direction, context, type.items, exterior[i]);
    }
    return exterior;
  }
  function FromArray10(direction, context, type, value) {
    return guard_exports.IsEqual(direction, "Decode") ? Decode4(direction, context, type, value) : Encode3(direction, context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/from_cyclic.mjs
  function FromCyclic9(direction, context, type, value) {
    value = FromType23(direction, { ...context, ...type.$defs }, Ref(type.$ref), value);
    return Callback(direction, context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/from_intersect.mjs
  function MergeInteriors(interiors) {
    return interiors.reduce((results, interior) => ({ ...results, ...interior }), {});
  }
  function NonMatchingInterior(value, interiors) {
    for (const interior of interiors)
      if (!guard_exports.IsDeepEqual(value, interior))
        return interior;
    return value;
  }
  function Decode5(direction, context, type, value) {
    if (guard_exports.IsEqual(type.allOf.length, 0))
      return Callback(direction, context, type, value);
    const interiors = type.allOf.map((schema) => FromType23(direction, context, schema, Clean(schema, Clone2(value))));
    const structural = interiors.every((result) => guard_exports.IsObject(result));
    const exterior = structural ? MergeInteriors(interiors) : NonMatchingInterior(value, interiors);
    return Callback(direction, context, type, exterior);
  }
  function Encode4(direction, context, type, value) {
    if (guard_exports.IsEqual(type.allOf.length, 0))
      return Callback(direction, context, type, value);
    const exterior = Callback(direction, context, type, value);
    const interiors = type.allOf.map((schema) => FromType23(direction, context, schema, Clean(schema, Clone2(exterior))));
    const structural = interiors.every((result) => guard_exports.IsObject(result));
    if (structural)
      return MergeInteriors(interiors);
    return NonMatchingInterior(exterior, interiors);
  }
  function FromIntersect9(direction, context, type, value) {
    return guard_exports.IsEqual(direction, "Decode") ? Decode5(direction, context, type, value) : Encode4(direction, context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/from_object.mjs
  function Decode6(direction, context, type, value) {
    if (!guard_exports.IsObjectNotArray(value))
      return value;
    for (const key of guard_exports.Keys(type.properties)) {
      if (!guard_exports.HasPropertyKey(value, key) || IsOptionalUndefined(type.properties[key], key, value))
        continue;
      value[key] = FromType23(direction, context, type.properties[key], value[key]);
    }
    return Callback(direction, context, type, value);
  }
  function Encode5(direction, context, type, value) {
    const exterior = Callback(direction, context, type, value);
    if (!guard_exports.IsObjectNotArray(exterior))
      return exterior;
    for (const key of guard_exports.Keys(type.properties)) {
      if (!guard_exports.HasPropertyKey(exterior, key) || IsOptionalUndefined(type.properties[key], key, exterior))
        continue;
      exterior[key] = FromType23(direction, context, type.properties[key], exterior[key]);
    }
    return exterior;
  }
  function FromObject14(direction, context, type, value) {
    return guard_exports.IsEqual(direction, "Decode") ? Decode6(direction, context, type, value) : Encode5(direction, context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/from_record.mjs
  function Decode7(direction, context, type, value) {
    if (!guard_exports.IsObjectNotArray(value))
      return value;
    const regexp = new RegExp(RecordPattern(type));
    for (const key of guard_exports.Keys(value)) {
      if (!regexp.test(key))
        continue;
      value[key] = FromType23(direction, context, RecordValue(type), value[key]);
    }
    return Callback(direction, context, type, value);
  }
  function Encode6(direction, context, type, value) {
    const exterior = Callback(direction, context, type, value);
    if (!guard_exports.IsObjectNotArray(exterior))
      return exterior;
    const regexp = new RegExp(RecordPattern(type));
    for (const key of guard_exports.Keys(exterior)) {
      if (!regexp.test(key))
        continue;
      exterior[key] = FromType23(direction, context, RecordValue(type), exterior[key]);
    }
    return exterior;
  }
  function FromRecord6(direction, context, type, value) {
    return guard_exports.IsEqual(direction, "Decode") ? Decode7(direction, context, type, value) : Encode6(direction, context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/from_ref.mjs
  function ResolveRef(direction, context, type, value) {
    return guard_exports.HasPropertyKey(context, type.$ref) ? FromType23(direction, context, context[type.$ref], value) : value;
  }
  function FromRef8(direction, context, type, value) {
    return guard_exports.IsEqual(direction, "Decode") ? Callback(direction, context, type, ResolveRef(direction, context, type, value)) : ResolveRef(direction, context, type, Callback(direction, context, type, value));
  }

  // runtime/node_modules/typebox/build/value/codec/from_tuple.mjs
  function Decode8(direction, context, type, value) {
    if (!guard_exports.IsArray(value))
      return value;
    for (let i = 0; i < Math.min(type.items.length, value.length); i++) {
      value[i] = FromType23(direction, context, type.items[i], value[i]);
    }
    return Callback(direction, context, type, value);
  }
  function Encode7(direction, context, type, value) {
    const exterior = Callback(direction, context, type, value);
    if (!guard_exports.IsArray(exterior))
      return value;
    for (let i = 0; i < Math.min(type.items.length, exterior.length); i++) {
      exterior[i] = FromType23(direction, context, type.items[i], exterior[i]);
    }
    return exterior;
  }
  function FromTuple8(direction, context, type, value) {
    return guard_exports.IsEqual(direction, "Decode") ? Decode8(direction, context, type, value) : Encode7(direction, context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/from_union.mjs
  function Decode9(direction, context, type, value) {
    for (const schema of type.anyOf) {
      if (!Check2(context, schema, value))
        continue;
      const variant = FromType23(direction, context, schema, value);
      return Callback(direction, context, type, variant);
    }
    return value;
  }
  function Encode8(direction, context, type, value) {
    const exterior = Callback(direction, context, type, value);
    for (const schema of type.anyOf) {
      const variant = FromType23(direction, context, schema, Clone2(exterior));
      if (!Check2(context, schema, variant))
        continue;
      return variant;
    }
    return exterior;
  }
  function FromUnion12(direction, context, type, value) {
    return guard_exports.IsEqual(direction, "Decode") ? Decode9(direction, context, type, value) : Encode8(direction, context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/from_type.mjs
  function FromType23(direction, context, type, value) {
    return IsArray3(type) ? FromArray10(direction, context, type, value) : IsCyclic(type) ? FromCyclic9(direction, context, type, value) : IsIntersect(type) ? FromIntersect9(direction, context, type, value) : IsObject3(type) ? FromObject14(direction, context, type, value) : IsRecord(type) ? FromRecord6(direction, context, type, value) : IsRef(type) ? FromRef8(direction, context, type, value) : IsTuple(type) ? FromTuple8(direction, context, type, value) : IsUnion(type) ? FromUnion12(direction, context, type, value) : Callback(direction, context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/decode.mjs
  var DecodeError = class extends AssertError {
    constructor(value, errors) {
      super("Decode", value, errors);
    }
  };
  function Assert2(context, type, value) {
    if (!Check2(context, type, value))
      throw new DecodeError(value, Errors2(context, type, value));
    return value;
  }
  function DecodeUnsafe(context, type, value) {
    const sorted = settings_exports.Get().unionPrioritySort ? UnionPrioritySort(type) : type;
    return FromType23("Decode", context, sorted, value);
  }
  var Decoder = Pipeline([
    (_context, _type, value) => Clone2(value),
    (context, type, value) => Default(context, type, value),
    (context, type, value) => Convert(context, type, value),
    (context, type, value) => Clean(context, type, value),
    (context, type, value) => Assert2(context, type, value),
    (context, type, value) => DecodeUnsafe(context, type, value)
  ]);
  function Decode10(...args) {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    return Decoder(context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/encode.mjs
  var EncodeError = class extends AssertError {
    constructor(value, errors) {
      super("Encode", value, errors);
    }
  };
  function Assert3(context, type, value) {
    if (!Check2(context, type, value))
      throw new EncodeError(value, Errors2(context, type, value));
    return value;
  }
  function EncodeUnsafe(context, type, value) {
    const sorted = settings_exports.Get().unionPrioritySort ? UnionPrioritySort(type) : type;
    return FromType23("Encode", context, sorted, value);
  }
  var Encoder = Pipeline([
    (_context, _type, value) => Clone2(value),
    (context, type, value) => EncodeUnsafe(context, type, value),
    (context, type, value) => Default(context, type, value),
    (context, type, value) => Convert(context, type, value),
    (context, type, value) => Clean(context, type, value),
    (context, type, value) => Assert3(context, type, value)
  ]);
  function Encode9(...args) {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    return Encoder(context, type, value);
  }

  // runtime/node_modules/typebox/build/value/codec/has.mjs
  function FromArray11(context, type) {
    return IsCodec(type) || FromType24(context, type.items);
  }
  function FromCyclic10(context, type) {
    return IsCodec(type) || FromRef9({ ...context, ...type.$defs }, Ref(type.$ref));
  }
  function FromIntersect10(context, type) {
    return IsCodec(type) || type.allOf.some((type2) => FromType24(context, type2));
  }
  function FromObject15(context, type) {
    return IsCodec(type) || guard_exports.Keys(type.properties).some((key) => {
      return FromType24(context, type.properties[key]);
    });
  }
  function FromRecord7(context, type) {
    return IsCodec(type) || FromType24(context, RecordValue(type));
  }
  function FromRef9(context, type) {
    if (visited.has(type.$ref))
      return false;
    visited.add(type.$ref);
    return IsCodec(type) || guard_exports.HasPropertyKey(context, type.$ref) && FromType24(context, context[type.$ref]);
  }
  function FromTuple9(context, type) {
    return IsCodec(type) || type.items.some((type2) => FromType24(context, type2));
  }
  function FromUnion13(context, type) {
    return IsCodec(type) || type.anyOf.some((type2) => FromType24(context, type2));
  }
  function FromType24(context, type) {
    return IsArray3(type) ? FromArray11(context, type) : IsCyclic(type) ? FromCyclic10(context, type) : IsIntersect(type) ? FromIntersect10(context, type) : IsObject3(type) ? FromObject15(context, type) : IsRecord(type) ? FromRecord7(context, type) : IsRef(type) ? FromRef9(context, type) : IsTuple(type) ? FromTuple9(context, type) : IsUnion(type) ? FromUnion13(context, type) : IsCodec(type);
  }
  var visited = /* @__PURE__ */ new Set();
  function HasCodec(...args) {
    const [context, type] = arguments_exports.Match(args, {
      2: (context2, type2) => [context2, type2],
      1: (type2) => [{}, type2]
    });
    visited.clear();
    return FromType24(context, type);
  }

  // runtime/node_modules/typebox/build/value/create/error.mjs
  var CreateError = class extends Error {
    constructor(type, message) {
      super(message);
      this.type = type;
    }
  };

  // runtime/node_modules/typebox/build/value/create/from_default.mjs
  function FromDefault2(_context, schema) {
    return guard_exports.IsFunction(schema.default) ? schema.default(schema) : guard_exports.IsObject(schema.default) ? Clone2(schema.default) : schema.default;
  }

  // runtime/node_modules/typebox/build/value/create/from_array.mjs
  function FromArray12(context, type) {
    if (IsUniqueItems(type) && !IsDefault(type))
      throw new CreateError(type, "Arrays with uniqueItems constraints must specify a default annotation");
    const length = IsMinItems(type) ? type.minItems : 0;
    return Array.from({ length }, () => FromType25(context, type.items));
  }

  // runtime/node_modules/typebox/build/value/create/from_bigint.mjs
  function FromBigInt7(_context, type) {
    return IsExclusiveMinimum(type) ? BigInt(type.exclusiveMinimum) + BigInt(1) : IsMinimum(type) ? BigInt(type.minimum) : BigInt(0);
  }

  // runtime/node_modules/typebox/build/value/create/from_boolean.mjs
  function FromBoolean7(_context, _type) {
    return false;
  }

  // runtime/node_modules/typebox/build/value/create/from_constructor.mjs
  function FromConstructor2(context, type) {
    const instanceType = FromType25(context, type.instanceType);
    return class {
      constructor() {
        Object.assign(this, instanceType);
      }
    };
  }

  // runtime/node_modules/typebox/build/value/create/from_cyclic.mjs
  function FromCyclic11(context, type) {
    return FromType25({ ...context, ...type.$defs }, Ref(type.$ref));
  }

  // runtime/node_modules/typebox/build/value/create/from_enum.mjs
  function FromEnum4(context, type) {
    return FromType25(context, Evaluate2(type));
  }

  // runtime/node_modules/typebox/build/value/create/from_function.mjs
  function FromFunction2(context, type) {
    const returnType = FromType25(context, type.returnType);
    return () => returnType;
  }

  // runtime/node_modules/typebox/build/value/create/from_integer.mjs
  function FromInteger2(_context, type) {
    return IsExclusiveMinimum(type) && guard_exports.IsNumber(type.exclusiveMinimum) ? type.exclusiveMinimum + 1 : IsMinimum(type) ? type.minimum : 0;
  }

  // runtime/node_modules/typebox/build/value/create/from_intersect.mjs
  function FromIntersect11(context, type) {
    const instantiated = Instantiate(context, type);
    const evaluated = Evaluate2(instantiated);
    return FromType25(context, evaluated);
  }

  // runtime/node_modules/typebox/build/value/create/from_literal.mjs
  function FromLiteral7(_context, type) {
    return type.const;
  }

  // runtime/node_modules/typebox/build/value/create/from_never.mjs
  function FromNever(_context, type) {
    throw new CreateError(type, "Cannot create TNever types");
  }

  // runtime/node_modules/typebox/build/value/create/from_null.mjs
  function FromNull3(_context, _type) {
    return null;
  }

  // runtime/node_modules/typebox/build/value/create/from_number.mjs
  function FromNumber6(_context, type) {
    return IsExclusiveMinimum(type) && guard_exports.IsNumber(type.exclusiveMinimum) ? type.exclusiveMinimum + 1 : IsMinimum(type) ? type.minimum : 0;
  }

  // runtime/node_modules/typebox/build/value/create/from_object.mjs
  function FromObject16(context, type) {
    const required = guard_exports.IsUndefined(type.required) ? [] : type.required;
    return required.reduce((result, key) => {
      return { ...result, [key]: FromType25(context, type.properties[key]) };
    }, {});
  }

  // runtime/node_modules/typebox/build/value/create/from_record.mjs
  function FromRecord8(_context, type) {
    if (IsMinProperties(type) && !IsDefault(type))
      throw new CreateError(type, "Record with the minProperties constraint must have a default annotation");
    return {};
  }

  // runtime/node_modules/typebox/build/value/create/from_ref.mjs
  function FromRef10(context, type) {
    return guard_exports.HasPropertyKey(context, type.$ref) ? FromType25(context, context[type.$ref]) : (() => {
      throw new CreateError(type, "Unable to deref Ref");
    })();
  }

  // runtime/node_modules/typebox/build/value/create/from_string.mjs
  function FromString8(_context, type) {
    const needsDefault = (IsPattern(type) || IsFormat(type)) && !IsDefault(type);
    if (needsDefault)
      throw Error("Strings with format or pattern constraints must specify default");
    const minLength = IsMinLength4(type) ? type.minLength : 0;
    return "".padEnd(minLength);
  }

  // runtime/node_modules/typebox/build/value/create/from_symbol.mjs
  function FromSymbol2(_context, _type) {
    return /* @__PURE__ */ Symbol();
  }

  // runtime/node_modules/typebox/build/value/create/from_template_literal.mjs
  function FromTemplateLiteral5(context, type) {
    const decoded = TemplateLiteralDecode(type.pattern);
    if (IsString4(decoded))
      throw new CreateError(type, "Unable to create TemplateLiteral due to infinite type expansion");
    return FromType25(context, decoded);
  }

  // runtime/node_modules/typebox/build/value/create/from_tuple.mjs
  function FromTuple10(context, type) {
    return Array.from({ length: type.minItems }, (_, i) => FromType25(context, type.items[i]));
  }

  // runtime/node_modules/typebox/build/value/create/from_undefined.mjs
  function FromUndefined3(_context, _type) {
    return void 0;
  }

  // runtime/node_modules/typebox/build/value/create/from_union.mjs
  function FromUnion14(context, type) {
    if (guard_exports.IsEqual(type.anyOf.length, 0)) {
      throw Error("Unable to create Union with no variants");
    }
    return FromType25(context, type.anyOf[0]);
  }

  // runtime/node_modules/typebox/build/value/create/from_void.mjs
  function FromVoid2(_context, _type) {
    return void 0;
  }

  // runtime/node_modules/typebox/build/value/create/from_type.mjs
  function FromType25(context, type) {
    return (
      // -----------------------------------------------------
      // Default
      // -----------------------------------------------------
      IsDefault(type) ? FromDefault2(context, type) : (
        // -----------------------------------------------------
        // Types
        // -----------------------------------------------------
        IsArray3(type) ? FromArray12(context, type) : IsBigInt3(type) ? FromBigInt7(context, type) : IsBoolean4(type) ? FromBoolean7(context, type) : IsConstructor3(type) ? FromConstructor2(context, type) : IsCyclic(type) ? FromCyclic11(context, type) : IsEnum(type) ? FromEnum4(context, type) : IsFunction3(type) ? FromFunction2(context, type) : IsInteger3(type) ? FromInteger2(context, type) : IsIntersect(type) ? FromIntersect11(context, type) : IsLiteral(type) ? FromLiteral7(context, type) : IsNever(type) ? FromNever(context, type) : IsNull3(type) ? FromNull3(context, type) : IsNumber4(type) ? FromNumber6(context, type) : IsObject3(type) ? FromObject16(context, type) : IsRecord(type) ? FromRecord8(context, type) : IsRef(type) ? FromRef10(context, type) : IsString4(type) ? FromString8(context, type) : IsSymbol3(type) ? FromSymbol2(context, type) : IsTemplateLiteral(type) ? FromTemplateLiteral5(context, type) : IsTuple(type) ? FromTuple10(context, type) : IsUndefined3(type) ? FromUndefined3(context, type) : IsUnion(type) ? FromUnion14(context, type) : IsVoid(type) ? FromVoid2(context, type) : void 0
      )
    );
  }

  // runtime/node_modules/typebox/build/value/create/create.mjs
  function Create2(...args) {
    const [context, type] = arguments_exports.Match(args, {
      2: (context2, type2) => [context2, type2],
      1: (type2) => [{}, type2]
    });
    return FromType25(context, type);
  }

  // runtime/node_modules/typebox/build/value/equal/equal.mjs
  function Equal(left, right) {
    return guard_exports.IsDeepEqual(left, right);
  }

  // runtime/node_modules/typebox/build/value/hash/hash.mjs
  function Hash2(value) {
    return hash_exports.Hash(value);
  }

  // runtime/node_modules/typebox/build/value/parse/parse.mjs
  var ParseError2 = class extends AssertError {
    constructor(value, errors) {
      super("Parse", value, errors);
    }
  };
  function Assert4(context, type, value) {
    if (!Check2(context, type, value))
      throw new ParseError2(value, Errors2(context, type, value));
    return value;
  }
  var Parser = Pipeline([
    (_context, _type, value) => Clone2(value),
    (context, type, value) => Default(context, type, value),
    (context, type, value) => Convert(context, type, value),
    (context, type, value) => Clean(context, type, value),
    (context, type, value) => Assert4(context, type, value)
  ]);
  function Parse(...args) {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    const checked = Check2(context, type, value);
    if (checked)
      return value;
    if (settings_exports.Get().correctiveParse)
      return Parser(context, type, value);
    throw new ParseError2(value, Errors2(context, type, value));
  }

  // runtime/node_modules/typebox/build/value/delta/diff.mjs
  function CreateUpdate(path, value) {
    return { type: "update", path, value };
  }
  function CreateInsert(path, value) {
    return { type: "insert", path, value };
  }
  function CreateDelete(path) {
    return { type: "delete", path };
  }
  function AssertCanDiffObject(value) {
    if (guard_exports.IsObject(value) && guard_exports.IsEqual(guard_exports.Symbols(value).length, 0))
      return;
    throw new Error("Cannot create diffs for objects with symbols keys");
  }
  function* FromObject17(path, left, right) {
    if (!guard_exports.IsObject(right) || guard_exports.IsArray(right))
      return yield CreateUpdate(path, right);
    AssertCanDiffObject(left);
    AssertCanDiffObject(right);
    const leftKeys = guard_exports.Keys(left);
    const rightKeys = guard_exports.Keys(right);
    for (const key of rightKeys) {
      if (guard_exports.HasPropertyKey(left, key))
        continue;
      if (guard_exports.IsUnsafePropertyKey(key))
        continue;
      yield CreateInsert(`${path}/${key}`, right[key]);
    }
    for (const key of leftKeys) {
      if (!guard_exports.HasPropertyKey(right, key))
        continue;
      if (guard_exports.IsUnsafePropertyKey(key))
        continue;
      if (Equal(left, right))
        continue;
      yield* FromValue4(`${path}/${key}`, left[key], right[key]);
    }
    for (const key of leftKeys) {
      if (guard_exports.HasPropertyKey(right, key))
        continue;
      if (guard_exports.IsUnsafePropertyKey(key))
        continue;
      yield CreateDelete(`${path}/${key}`);
    }
  }
  function* FromArray13(path, left, right) {
    if (!guard_exports.IsArray(right))
      return yield CreateUpdate(path, right);
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      yield* FromValue4(`${path}/${i}`, left[i], right[i]);
    }
    for (let i = 0; i < right.length; i++) {
      if (i < left.length)
        continue;
      yield CreateInsert(`${path}/${i}`, right[i]);
    }
    for (let i = left.length - 1; i >= 0; i--) {
      if (i < right.length)
        continue;
      yield CreateDelete(`${path}/${i}`);
    }
  }
  function* FromTypedArray2(path, left, right) {
    const typeLeft = globalThis.Object.getPrototypeOf(left).constructor.name;
    const typeRight = globalThis.Object.getPrototypeOf(right).constructor.name;
    const predicate = globals_exports.IsTypeArray(right) && guard_exports.IsEqual(left.length, right.length) && guard_exports.IsEqual(typeLeft, typeRight);
    if (predicate) {
      for (let index3 = 0; index3 < Math.min(left.length, right.length); index3++) {
        yield* FromValue4(`${path}/${index3}`, left[index3], right[index3]);
      }
    } else {
      return yield CreateUpdate(path, right);
    }
  }
  function* FromUnknown(path, left, right) {
    if (left === right)
      return;
    yield CreateUpdate(path, right);
  }
  function* FromValue4(path, left, right) {
    return globals_exports.IsTypeArray(left) ? yield* FromTypedArray2(path, left, right) : guard_exports.IsArray(left) ? yield* FromArray13(path, left, right) : guard_exports.IsObject(left) ? yield* FromObject17(path, left, right) : yield* FromUnknown(path, left, right);
  }
  function Diff(current, next) {
    return [...FromValue4("", current, next)];
  }

  // runtime/node_modules/typebox/build/value/delta/edit.mjs
  var Insert2 = _Object_({
    type: Literal("insert"),
    path: String2(),
    value: Unknown()
  });
  var Update2 = Object({
    type: Literal("update"),
    path: String2(),
    value: Unknown()
  });
  var Delete2 = _Object_({
    type: Literal("delete"),
    path: String2()
  });
  var Edit = Union([Insert2, Update2, Delete2]);

  // runtime/node_modules/typebox/build/value/delta/patch.mjs
  function IsRoot(edits) {
    return edits.length > 0 && edits[0].path === "" && edits[0].type === "update";
  }
  function IsEmpty(edits) {
    return edits.length === 0;
  }
  function Patch(current, edits) {
    if (IsRoot(edits))
      return Clone2(edits[0].value);
    if (IsEmpty(edits))
      return Clone2(current);
    const clone = Clone2(current);
    for (const edit of edits) {
      switch (edit.type) {
        case "insert": {
          pointer_exports.Set(clone, edit.path, edit.value);
          break;
        }
        case "update": {
          pointer_exports.Set(clone, edit.path, edit.value);
          break;
        }
        case "delete": {
          pointer_exports.Delete(clone, edit.path);
          break;
        }
      }
    }
    return clone;
  }

  // runtime/node_modules/typebox/build/value/repair/error.mjs
  var RepairError = class extends Error {
    constructor(context, type, value, message) {
      super(message);
      this.context = context;
      this.type = type;
      this.value = value;
    }
  };

  // runtime/node_modules/typebox/build/value/repair/from_array.mjs
  function MakeUnique(values) {
    const [hashes, result] = [/* @__PURE__ */ new Set(), []];
    for (const value of values) {
      const hash = Hash2(value);
      if (hashes.has(hash))
        continue;
      hashes.add(hash);
      result.push(value);
    }
    return result;
  }
  function FromArray14(context, type, value) {
    if (Check2(context, type, value))
      return value;
    const created = guard_exports.IsArray(value) ? value : Create2(context, type);
    const minimum = IsMinItems(type) && created.length < type.minItems ? [...created, ...Array.from({ length: type.minItems - created.length }, () => Create2(context, type))] : created;
    const maximum = IsMaxItems(type) && minimum.length > type.maxItems ? minimum.slice(0, type.maxItems) : minimum;
    const repaired = maximum.map((value2) => FromType26(context, type.items, value2));
    if (!IsUniqueItems(type) || IsUniqueItems(type) && !guard_exports.IsEqual(type.uniqueItems, true))
      return repaired;
    const unique = MakeUnique(repaired);
    if (!Check2(context, type, unique))
      throw new RepairError(context, type, value, "Failed to repair Array due to uniqueItems constraint");
    return unique;
  }

  // runtime/node_modules/typebox/build/value/repair/from_enum.mjs
  function FromEnum5(context, type, value) {
    return FromType26(context, Evaluate2(type), value);
  }

  // runtime/node_modules/typebox/build/value/repair/from_intersect.mjs
  function FromIntersect12(context, type, value) {
    const instantiated = Instantiate(context, type);
    const evaluated = Evaluate2(instantiated);
    return FromType26(context, evaluated, value);
  }

  // runtime/node_modules/typebox/build/value/repair/from_object.mjs
  function FromObject18(context, type, value) {
    if (Check2(context, type, value))
      return value;
    if (!guard_exports.IsObjectNotArray(value))
      return Create2(context, type);
    const required = new Set(guard_exports.IsUndefined(type.required) ? [] : type.required);
    const result = {};
    for (const [key, schema] of guard_exports.Entries(type.properties)) {
      if (!required.has(key) && guard_exports.IsUndefined(value[key]))
        continue;
      result[key] = key in value ? FromType26(context, schema, value[key]) : Create2(context, schema);
    }
    const evaluatedKeys = guard_exports.Keys(type.properties);
    if (IsAdditionalProperties(type) && guard_exports.IsObject(type.additionalProperties)) {
      for (const key of guard_exports.Keys(value)) {
        if (evaluatedKeys.includes(key))
          continue;
        result[key] = FromType26(context, type.additionalProperties, value[key]);
      }
    }
    return result;
  }

  // runtime/node_modules/typebox/build/value/repair/from_record.mjs
  function FromRecord9(context, type, value) {
    if (Check2(context, type, value))
      return value;
    if (guard_exports.IsNull(value) || !guard_exports.IsObject(value) || guard_exports.IsArray(value))
      return Create2(context, type);
    const recordKey = new RegExp(RecordPattern(type));
    const recordValue = RecordValue(type);
    const evaluatedKeys = /* @__PURE__ */ new Set();
    const result = {};
    for (const [key, value_] of guard_exports.Entries(value)) {
      if (!recordKey.test(key))
        continue;
      result[key] = FromType26(context, recordValue, value_);
      evaluatedKeys.add(key);
    }
    if (IsAdditionalProperties(type)) {
      for (const key of guard_exports.Keys(value)) {
        if (evaluatedKeys.has(key))
          continue;
        result[key] = FromType26(context, type.additionalProperties, value[key]);
      }
    }
    return result;
  }

  // runtime/node_modules/typebox/build/value/repair/from_ref.mjs
  function FromRef11(context, type, value) {
    return guard_exports.HasPropertyKey(context, type.$ref) ? FromType26(context, context[type.$ref], value) : (() => {
      throw new RepairError(context, type, value, "Unable to de-reference target type");
    })();
  }

  // runtime/node_modules/typebox/build/value/repair/from_template_literal.mjs
  function FromTemplateLiteral6(context, type, value) {
    const decoded = TemplateLiteralDecode(type.pattern);
    return FromType26(context, decoded, value);
  }

  // runtime/node_modules/typebox/build/value/repair/from_tuple.mjs
  function FromTuple11(context, schema, value) {
    if (Check2(context, schema, value))
      return value;
    if (!guard_exports.IsArray(value))
      return Create2(context, schema);
    return schema.items.map((schema2, index3) => FromType26(context, schema2, value[index3]));
  }

  // runtime/node_modules/typebox/build/value/shared/union_score_select.mjs
  function Deref(context, type, value) {
    return IsRef(type) ? guard_exports.HasPropertyKey(context, type.$ref) ? Deref(context, context[type.$ref], value) : (() => {
      throw new Error("Unable to Deref target");
    })() : type;
  }
  function ScoreVariant(context, type, value) {
    if (!(IsObject3(type) && guard_exports.IsObject(value)))
      return 0;
    const keys = guard_exports.Keys(value);
    const entries = guard_exports.Entries(type.properties);
    return entries.reduce((result, [key, schema]) => {
      const literal = IsLiteral(schema) && guard_exports.IsEqual(schema.const, value[key]) ? 100 : 0;
      const checks = Check2(context, schema, value[key]) ? 10 : 0;
      const exists = keys.includes(key) ? 1 : 0;
      return result + (literal + checks + exists);
    }, 0);
  }
  function UnionScoreSelect(context, type, value) {
    const schemas2 = type.anyOf.map((schema) => Deref(context, schema, value));
    let [select, best] = [schemas2[0], 0];
    for (const schema of schemas2) {
      const score = ScoreVariant(context, schema, value);
      if (score > best) {
        select = schema;
        best = score;
      }
    }
    return select;
  }

  // runtime/node_modules/typebox/build/value/repair/from_union.mjs
  function RepairUnion(context, type, value) {
    const union = Union(Flatten(type.anyOf));
    const schema = UnionScoreSelect(context, union, value);
    return FromType26(context, schema, value);
  }
  function FromUnion15(context, type, value) {
    if (Check2(context, type, value))
      return Clone2(value);
    if (IsDefault(type))
      return Create2(context, type);
    return RepairUnion(context, type, value);
  }

  // runtime/node_modules/typebox/build/value/repair/from_unknown.mjs
  function FromUnknown2(context, type, value) {
    if (Check2(context, type, value))
      return value;
    const converted = Convert(context, type, value);
    if (Check2(context, type, converted))
      return converted;
    return Create2(context, type);
  }

  // runtime/node_modules/typebox/build/value/repair/from_type.mjs
  function AssertRepairableValue(context, type, value) {
    const unsupported = globals_exports.IsDate(value) || globals_exports.IsMap(value) || globals_exports.IsSet(value) || globals_exports.IsTypeArray(value) || guard_exports.IsConstructor(value) || guard_exports.IsFunction(value);
    if (unsupported) {
      throw new RepairError(context, type, value, "Value is not repairable");
    }
  }
  function AssertRepairableType(context, type, value) {
    const unsupported = IsConstructor3(type) || IsFunction3(type) || IsNever(type);
    if (unsupported) {
      throw new RepairError(context, type, value, "Type is not repairable");
    }
  }
  function CreateWhenUndefined(context, type, value) {
    return guard_exports.IsUndefined(value) && !IsUndefined3(type) ? Create2(context, type) : value;
  }
  function FinalizeRepair(context, type, repaired) {
    return IsRefine(type) ? Check2(context, type, repaired) ? repaired : Create2(context, type) : repaired;
  }
  function FromType26(context, type, value) {
    AssertRepairableValue(context, type, value);
    AssertRepairableType(context, type, value);
    const candidate = CreateWhenUndefined(context, type, value);
    const repaired = IsArray3(type) ? FromArray14(context, type, candidate) : IsEnum(type) ? FromEnum5(context, type, candidate) : IsIntersect(type) ? FromIntersect12(context, type, candidate) : IsObject3(type) ? FromObject18(context, type, candidate) : IsRecord(type) ? FromRecord9(context, type, candidate) : IsRef(type) ? FromRef11(context, type, candidate) : IsTemplateLiteral(type) ? FromTemplateLiteral6(context, type, candidate) : IsTuple(type) ? FromTuple11(context, type, candidate) : IsUnion(type) ? FromUnion15(context, type, candidate) : FromUnknown2(context, type, candidate);
    return FinalizeRepair(context, type, repaired);
  }

  // runtime/node_modules/typebox/build/value/repair/repair.mjs
  function Repair(...args) {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    const repaired = FromType26(context, type, value);
    Assert(context, type, repaired);
    return repaired;
  }

  // runtime/node_modules/typebox/build/value/value.mjs
  var value_exports = {};
  __export(value_exports, {
    Assert: () => Assert,
    Check: () => Check2,
    Clean: () => Clean,
    Clone: () => Clone2,
    Convert: () => Convert,
    Create: () => Create2,
    Decode: () => Decode10,
    Default: () => Default,
    Diff: () => Diff,
    Encode: () => Encode9,
    Equal: () => Equal,
    Errors: () => Errors2,
    HasCodec: () => HasCodec,
    Hash: () => Hash2,
    Parse: () => Parse,
    Patch: () => Patch,
    Pointer: () => pointer_exports,
    Repair: () => Repair
  });

  // runtime/node_modules/typebox/build/compile/validator.mjs
  var Validator = class {
    /** Constructs a Validator. */
    constructor(context, type) {
      this.hasCodec = HasCodec(context, type);
      this.buildResult = Build(context, type);
      this.evaluateResult = this.buildResult.Evaluate();
    }
    // ----------------------------------------------------------------
    // IsAccelerated
    // ----------------------------------------------------------------
    /** Returns true if this Validator is using JIT acceleration. */
    IsAccelerated() {
      return this.evaluateResult.IsAccelerated();
    }
    // ----------------------------------------------------------------
    // Context & Type
    // ----------------------------------------------------------------
    /** Returns the Context for this validator. */
    Context() {
      return this.buildResult.Context();
    }
    /** Returns the underlying Type used to construct this Validator. */
    Type() {
      return this.buildResult.Schema();
    }
    // ----------------------------------------------------------------
    // Code
    // ----------------------------------------------------------------
    /** Returns the generated code for this validator. */
    Code() {
      return this.evaluateResult.Code();
    }
    // ----------------------------------------------------------------
    // Standard Validator
    // ----------------------------------------------------------------
    /** Performs a type-guard check on the provided value. */
    Check(value) {
      return this.evaluateResult.Check(value);
    }
    /** Validates a value and returns it. Will throw if invalid. */
    Parse(value) {
      const checked = this.Check(value);
      if (checked)
        return value;
      if (settings_exports.Get().correctiveParse)
        return Parser(this.Context(), this.Type(), value);
      throw new ParseError2(value, this.Errors(value));
    }
    /** Inspects a value and returns a detailed list of validation errors. */
    Errors(value) {
      if (this.IsAccelerated() && this.Check(value))
        return [];
      return Errors2(this.Context(), this.Type(), value);
    }
    // ----------------------------------------------------------------
    // Value.* Operations
    // ----------------------------------------------------------------
    /** Cleans a value using the Validator type. */
    Clean(value) {
      return Clean(this.Context(), this.Type(), value);
    }
    /** Converts a value using the Validator type. */
    Convert(value) {
      return Convert(this.Context(), this.Type(), value);
    }
    /** Creates a value using the Validator type. */
    Create() {
      return Create2(this.Context(), this.Type());
    }
    /** Creates defaults using the Validator type. */
    Default(value) {
      return Default(this.Context(), this.Type(), value);
    }
    /** Decodes a value */
    Decode(value) {
      const result = this.hasCodec ? Decode10(this.Context(), this.Type(), value) : this.Parse(value);
      return result;
    }
    /** Encodes a value */
    Encode(value) {
      const result = this.hasCodec ? Encode9(this.Context(), this.Type(), value) : this.Parse(value);
      return result;
    }
  };

  // runtime/node_modules/typebox/build/compile/compile.mjs
  function Compile(...args) {
    const [context, type] = arguments_exports.Match(args, {
      2: (context2, type2) => [context2, type2],
      1: (type2) => [{}, type2]
    });
    return new Validator(context, type);
  }

  // runtime/node_modules/@earendil-works/pi-ai/dist/utils/validation.js
  var validatorCache = /* @__PURE__ */ new WeakMap();
  var TYPEBOX_KIND = /* @__PURE__ */ Symbol.for("TypeBox.Kind");
  function getSchemaTypes(schema) {
    if (typeof schema.type === "string") {
      return [schema.type];
    }
    if (Array.isArray(schema.type)) {
      return schema.type.filter((type) => typeof type === "string");
    }
    return [];
  }
  function matchesJsonType(value, type) {
    switch (type) {
      case "number":
        return typeof value === "number";
      case "integer":
        return typeof value === "number" && Number.isInteger(value);
      case "boolean":
        return typeof value === "boolean";
      case "string":
        return typeof value === "string";
      case "null":
        return value === null;
      case "array":
        return Array.isArray(value);
      case "object":
        return typeof value === "object" && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }
  function getSubSchemaValidator(schema) {
    try {
      return getValidator(schema);
    } catch {
      return void 0;
    }
  }
  function coercePrimitiveByType(value, type) {
    switch (type) {
      case "number": {
        if (value === null) {
          return 0;
        }
        if (typeof value === "string" && value.trim() !== "") {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            return parsed;
          }
        }
        if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        return value;
      }
      case "integer": {
        if (value === null) {
          return 0;
        }
        if (typeof value === "string" && value.trim() !== "") {
          const parsed = Number(value);
          if (Number.isInteger(parsed)) {
            return parsed;
          }
        }
        if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        return value;
      }
      case "boolean": {
        if (value === null) {
          return false;
        }
        if (typeof value === "string") {
          if (value === "true") {
            return true;
          }
          if (value === "false") {
            return false;
          }
        }
        if (typeof value === "number") {
          if (value === 1) {
            return true;
          }
          if (value === 0) {
            return false;
          }
        }
        return value;
      }
      case "string": {
        if (value === null) {
          return "";
        }
        if (typeof value === "number" || typeof value === "boolean") {
          return String(value);
        }
        return value;
      }
      case "null": {
        if (value === "" || value === 0 || value === false) {
          return null;
        }
        return value;
      }
      default:
        return value;
    }
  }
  function applySchemaObjectCoercion(value, schema) {
    const properties = schema.properties;
    const definedKeys = new Set(properties ? Object.keys(properties) : []);
    if (properties) {
      for (const [key, propertySchema] of Object.entries(properties)) {
        if (!(key in value)) {
          continue;
        }
        value[key] = coerceWithJsonSchema(value[key], propertySchema);
      }
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      for (const [key, propertyValue] of Object.entries(value)) {
        if (definedKeys.has(key)) {
          continue;
        }
        value[key] = coerceWithJsonSchema(propertyValue, schema.additionalProperties);
      }
    }
  }
  function applySchemaArrayCoercion(value, schema) {
    if (Array.isArray(schema.items)) {
      for (let index3 = 0; index3 < value.length; index3++) {
        const itemSchema = schema.items[index3];
        if (!itemSchema) {
          continue;
        }
        value[index3] = coerceWithJsonSchema(value[index3], itemSchema);
      }
      return;
    }
    if (schema.items && typeof schema.items === "object") {
      for (let index3 = 0; index3 < value.length; index3++) {
        value[index3] = coerceWithJsonSchema(value[index3], schema.items);
      }
    }
  }
  function coerceWithUnionSchema(value, schemas2) {
    for (const schema of schemas2) {
      const validator = getSubSchemaValidator(schema);
      if (validator?.Check(value)) {
        return value;
      }
    }
    for (const schema of schemas2) {
      const candidate = structuredClone(value);
      const coerced = coerceWithJsonSchema(candidate, schema);
      const validator = getSubSchemaValidator(schema);
      if (validator?.Check(coerced)) {
        return coerced;
      }
    }
    return value;
  }
  function coerceWithJsonSchema(value, schema) {
    let nextValue = value;
    if (Array.isArray(schema.allOf)) {
      for (const nested of schema.allOf) {
        nextValue = coerceWithJsonSchema(nextValue, nested);
      }
    }
    if (Array.isArray(schema.anyOf)) {
      nextValue = coerceWithUnionSchema(nextValue, schema.anyOf);
    }
    if (Array.isArray(schema.oneOf)) {
      nextValue = coerceWithUnionSchema(nextValue, schema.oneOf);
    }
    const schemaTypes = getSchemaTypes(schema);
    const matchesUnionMember = schemaTypes.length > 1 && schemaTypes.some((schemaType) => matchesJsonType(nextValue, schemaType));
    if (schemaTypes.length > 0 && !matchesUnionMember) {
      for (const schemaType of schemaTypes) {
        const candidate = coercePrimitiveByType(nextValue, schemaType);
        if (candidate !== nextValue) {
          nextValue = candidate;
          break;
        }
      }
    }
    if (schemaTypes.includes("object") && typeof nextValue === "object" && nextValue !== null && !Array.isArray(nextValue)) {
      applySchemaObjectCoercion(nextValue, schema);
    }
    if (schemaTypes.includes("array") && Array.isArray(nextValue)) {
      applySchemaArrayCoercion(nextValue, schema);
    }
    return nextValue;
  }
  function normalizeOptionalNulls(value, schema) {
    if (Array.isArray(value)) {
      if (Array.isArray(schema.items)) {
        for (let index3 = 0; index3 < value.length; index3++) {
          const itemSchema = schema.items[index3];
          if (itemSchema)
            normalizeOptionalNulls(value[index3], itemSchema);
        }
      } else if (schema.items) {
        for (const item of value)
          normalizeOptionalNulls(item, schema.items);
      }
      return;
    }
    if (typeof value !== "object" || value === null || !schema.properties)
      return;
    const object = value;
    const required = new Set(schema.required ?? []);
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
      if (!(key in object))
        continue;
      if (object[key] === null && !required.has(key) && typeof propertySchema.$ref !== "string" && getSubSchemaValidator(propertySchema)?.Check(null) === false) {
        delete object[key];
      } else {
        normalizeOptionalNulls(object[key], propertySchema);
      }
    }
  }
  function getValidator(schema) {
    const key = schema;
    const cached = validatorCache.get(key);
    if (cached) {
      return cached;
    }
    const validator = Compile(schema);
    validatorCache.set(key, validator);
    return validator;
  }
  function formatValidationPath(error) {
    if (error.keyword === "required") {
      const requiredProperties = error.params.requiredProperties;
      const requiredProperty = requiredProperties?.[0];
      if (requiredProperty) {
        const basePath = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
        return basePath ? `${basePath}.${requiredProperty}` : requiredProperty;
      }
    }
    const path = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
    return path || "root";
  }
  function validateToolArguments(tool2, toolCall) {
    const args = structuredClone(toolCall.arguments);
    normalizeOptionalNulls(args, tool2.parameters);
    value_exports.Convert(tool2.parameters, args);
    const validator = getValidator(tool2.parameters);
    if (!Object.getOwnPropertySymbols(tool2.parameters).includes(TYPEBOX_KIND)) {
      const coerced = coerceWithJsonSchema(args, tool2.parameters);
      if (coerced !== args) {
        if (typeof args === "object" && args !== null && typeof coerced === "object" && coerced !== null) {
          for (const key of Object.keys(args)) {
            delete args[key];
          }
          Object.assign(args, coerced);
        } else {
          return validator.Check(coerced) ? coerced : args;
        }
      }
    }
    if (validator.Check(args)) {
      return args;
    }
    const errors = validator.Errors(args).map((error) => `  - ${formatValidationPath(error)}: ${error.message}`).join("\n") || "Unknown validation error";
    const errorMessage = `Validation failed for tool "${toolCall.name}":
${errors}

Received arguments:
${JSON.stringify(toolCall.arguments, null, 2)}`;
    throw new Error(errorMessage);
  }

  // runtime/node_modules/@earendil-works/pi-agent-core/dist/stream-fn.js
  var defaultStreamFn;
  function getDefaultStreamFn() {
    if (!defaultStreamFn) {
      throw new Error("No default stream function configured. Pass streamFn explicitly or call setDefaultStreamFn().");
    }
    return defaultStreamFn;
  }

  // runtime/node_modules/@earendil-works/pi-agent-core/dist/agent-loop.js
  async function runAgentLoop(prompts, context, config, emit, signal, streamFn) {
    const newMessages = [...prompts];
    const currentContext = {
      ...context,
      messages: [...context.messages, ...prompts]
    };
    await emit({ type: "agent_start" });
    await emit({ type: "turn_start" });
    for (const prompt of prompts) {
      await emit({ type: "message_start", message: prompt });
      await emit({ type: "message_end", message: prompt });
    }
    await runLoop(currentContext, newMessages, config, signal, emit, streamFn ?? getDefaultStreamFn());
    return newMessages;
  }
  async function runAgentLoopContinue(context, config, emit, signal, streamFn) {
    if (context.messages.length === 0) {
      throw new Error("Cannot continue: no messages in context");
    }
    if (context.messages[context.messages.length - 1].role === "assistant") {
      throw new Error("Cannot continue from message role: assistant");
    }
    const newMessages = [];
    const currentContext = { ...context };
    await emit({ type: "agent_start" });
    await emit({ type: "turn_start" });
    await runLoop(currentContext, newMessages, config, signal, emit, streamFn ?? getDefaultStreamFn());
    return newMessages;
  }
  async function runLoop(initialContext, newMessages, initialConfig, signal, emit, streamFunction) {
    let currentContext = initialContext;
    let config = initialConfig;
    let lastCompletedTurn;
    let pendingMessages = await config.getSteeringMessages?.() || [];
    while (true) {
      let hasMoreToolCalls = true;
      while (hasMoreToolCalls || pendingMessages.length > 0) {
        if (lastCompletedTurn) {
          const nextTurnSnapshot = await config.prepareNextTurn?.(lastCompletedTurn);
          if (nextTurnSnapshot) {
            currentContext = nextTurnSnapshot.context ?? currentContext;
            config = {
              ...config,
              model: nextTurnSnapshot.model ?? config.model,
              reasoning: nextTurnSnapshot.thinkingLevel === void 0 ? config.reasoning : nextTurnSnapshot.thinkingLevel === "off" ? void 0 : nextTurnSnapshot.thinkingLevel
            };
          }
          if (pendingMessages.length === 0) {
            pendingMessages = await config.getSteeringMessages?.() || [];
          }
          await emit({ type: "turn_start" });
        }
        if (pendingMessages.length > 0) {
          for (const message2 of pendingMessages) {
            await emit({ type: "message_start", message: message2 });
            await emit({ type: "message_end", message: message2 });
            currentContext.messages.push(message2);
            newMessages.push(message2);
          }
          pendingMessages = [];
        }
        const message = await streamAssistantResponse(currentContext, config, signal, emit, streamFunction);
        newMessages.push(message);
        if (message.stopReason === "error" || message.stopReason === "aborted") {
          await emit({ type: "turn_end", message, toolResults: [] });
          await emit({ type: "agent_end", messages: newMessages });
          return;
        }
        const toolCalls = message.content.filter((c) => c.type === "toolCall");
        const toolResults = [];
        hasMoreToolCalls = false;
        if (toolCalls.length > 0) {
          const executedToolBatch = message.stopReason === "length" ? await failToolCallsFromTruncatedMessage(toolCalls, emit) : await executeToolCalls(currentContext, message, config, signal, emit);
          toolResults.push(...executedToolBatch.messages);
          hasMoreToolCalls = !executedToolBatch.terminate;
          for (const result of toolResults) {
            currentContext.messages.push(result);
            newMessages.push(result);
          }
        }
        await emit({ type: "turn_end", message, toolResults });
        lastCompletedTurn = {
          message,
          toolResults,
          context: currentContext,
          newMessages
        };
        if (await config.shouldStopAfterTurn?.(lastCompletedTurn)) {
          await emit({ type: "agent_end", messages: newMessages });
          return;
        }
        pendingMessages = await config.getSteeringMessages?.() || [];
      }
      const followUpMessages = await config.getFollowUpMessages?.() || [];
      if (followUpMessages.length > 0) {
        pendingMessages = followUpMessages;
        continue;
      }
      break;
    }
    await emit({ type: "agent_end", messages: newMessages });
  }
  async function streamAssistantResponse(context, config, signal, emit, streamFunction) {
    let messages = context.messages;
    if (config.transformContext) {
      messages = await config.transformContext(messages, signal);
    }
    const llmMessages = await config.convertToLlm(messages);
    const llmContext = {
      systemPrompt: context.systemPrompt,
      messages: llmMessages,
      tools: context.tools
    };
    const resolvedApiKey = (config.getApiKey ? await config.getApiKey(config.model.provider) : void 0) || config.apiKey;
    const response = await streamFunction(config.model, llmContext, {
      ...config,
      apiKey: resolvedApiKey,
      signal
    });
    let partialMessage = null;
    let addedPartial = false;
    for await (const event of response) {
      switch (event.type) {
        case "start":
          partialMessage = event.partial;
          context.messages.push(partialMessage);
          addedPartial = true;
          await emit({ type: "message_start", message: { ...partialMessage } });
          break;
        case "text_start":
        case "text_delta":
        case "text_end":
        case "thinking_start":
        case "thinking_delta":
        case "thinking_end":
        case "toolcall_start":
        case "toolcall_delta":
        case "toolcall_end":
          if (partialMessage) {
            partialMessage = event.partial;
            context.messages[context.messages.length - 1] = partialMessage;
            await emit({
              type: "message_update",
              assistantMessageEvent: event,
              message: { ...partialMessage }
            });
          }
          break;
        case "done":
        case "error": {
          const finalMessage2 = await response.result();
          if (addedPartial) {
            context.messages[context.messages.length - 1] = finalMessage2;
          } else {
            context.messages.push(finalMessage2);
          }
          if (!addedPartial) {
            await emit({ type: "message_start", message: { ...finalMessage2 } });
          }
          await emit({ type: "message_end", message: finalMessage2 });
          return finalMessage2;
        }
      }
    }
    const finalMessage = await response.result();
    if (addedPartial) {
      context.messages[context.messages.length - 1] = finalMessage;
    } else {
      context.messages.push(finalMessage);
      await emit({ type: "message_start", message: { ...finalMessage } });
    }
    await emit({ type: "message_end", message: finalMessage });
    return finalMessage;
  }
  async function failToolCallsFromTruncatedMessage(toolCalls, emit) {
    const messages = [];
    for (const toolCall of toolCalls) {
      await emit({
        type: "tool_execution_start",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        args: toolCall.arguments
      });
      const finalized = {
        toolCall,
        result: createErrorToolResult(`Tool call "${toolCall.name}" was not executed: the response hit the output token limit, so its arguments may be truncated. Re-issue the tool call with complete arguments.`),
        isError: true
      };
      await emitToolExecutionEnd(finalized, emit);
      const toolResultMessage = createToolResultMessage(finalized);
      await emitToolResultMessage(toolResultMessage, emit);
      messages.push(toolResultMessage);
    }
    return { messages, terminate: false };
  }
  async function executeToolCalls(currentContext, assistantMessage, config, signal, emit) {
    const toolCalls = assistantMessage.content.filter((c) => c.type === "toolCall");
    const hasSequentialToolCall = toolCalls.some((tc) => currentContext.tools?.find((t) => t.name === tc.name)?.executionMode === "sequential");
    if (config.toolExecution === "sequential" || hasSequentialToolCall) {
      return executeToolCallsSequential(currentContext, assistantMessage, toolCalls, config, signal, emit);
    }
    return executeToolCallsParallel(currentContext, assistantMessage, toolCalls, config, signal, emit);
  }
  async function executeToolCallsSequential(currentContext, assistantMessage, toolCalls, config, signal, emit) {
    const finalizedCalls = [];
    const messages = [];
    for (const toolCall of toolCalls) {
      await emit({
        type: "tool_execution_start",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        args: toolCall.arguments
      });
      const preparation = await prepareToolCall(currentContext, assistantMessage, toolCall, config, signal);
      let finalized;
      if (preparation.kind === "immediate") {
        finalized = {
          toolCall,
          result: preparation.result,
          isError: preparation.isError
        };
      } else {
        const executed = await executePreparedToolCall(preparation, signal, emit);
        finalized = await finalizeExecutedToolCall(currentContext, assistantMessage, preparation, executed, config, signal);
      }
      await emitToolExecutionEnd(finalized, emit);
      const toolResultMessage = createToolResultMessage(finalized);
      await emitToolResultMessage(toolResultMessage, emit);
      finalizedCalls.push(finalized);
      messages.push(toolResultMessage);
      if (signal?.aborted) {
        break;
      }
    }
    return {
      messages,
      terminate: shouldTerminateToolBatch(finalizedCalls)
    };
  }
  async function executeToolCallsParallel(currentContext, assistantMessage, toolCalls, config, signal, emit) {
    const finalizedCalls = [];
    for (const toolCall of toolCalls) {
      await emit({
        type: "tool_execution_start",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        args: toolCall.arguments
      });
      const preparation = await prepareToolCall(currentContext, assistantMessage, toolCall, config, signal);
      if (preparation.kind === "immediate") {
        const finalized = {
          toolCall,
          result: preparation.result,
          isError: preparation.isError
        };
        await emitToolExecutionEnd(finalized, emit);
        finalizedCalls.push(finalized);
        if (signal?.aborted) {
          break;
        }
        continue;
      }
      finalizedCalls.push(async () => {
        if (signal?.aborted) {
          const finalized2 = {
            toolCall,
            result: createErrorToolResult("Operation aborted"),
            isError: true
          };
          await emitToolExecutionEnd(finalized2, emit);
          return finalized2;
        }
        const executed = await executePreparedToolCall(preparation, signal, emit);
        const finalized = await finalizeExecutedToolCall(currentContext, assistantMessage, preparation, executed, config, signal);
        await emitToolExecutionEnd(finalized, emit);
        return finalized;
      });
      if (signal?.aborted) {
        break;
      }
    }
    const orderedFinalizedCalls = await Promise.all(finalizedCalls.map((entry) => typeof entry === "function" ? entry() : Promise.resolve(entry)));
    const messages = [];
    for (const finalized of orderedFinalizedCalls) {
      const toolResultMessage = createToolResultMessage(finalized);
      await emitToolResultMessage(toolResultMessage, emit);
      messages.push(toolResultMessage);
    }
    return {
      messages,
      terminate: shouldTerminateToolBatch(orderedFinalizedCalls)
    };
  }
  function shouldTerminateToolBatch(finalizedCalls) {
    return finalizedCalls.length > 0 && finalizedCalls.every((finalized) => finalized.result.terminate === true);
  }
  function prepareToolCallArguments(tool2, toolCall) {
    if (!tool2.prepareArguments) {
      return toolCall;
    }
    const preparedArguments = tool2.prepareArguments(toolCall.arguments);
    if (preparedArguments === toolCall.arguments) {
      return toolCall;
    }
    return {
      ...toolCall,
      arguments: preparedArguments
    };
  }
  async function prepareToolCall(currentContext, assistantMessage, toolCall, config, signal) {
    const tool2 = currentContext.tools?.find((t) => t.name === toolCall.name);
    if (!tool2) {
      return {
        kind: "immediate",
        result: createErrorToolResult(`Tool ${toolCall.name} not found`),
        isError: true
      };
    }
    try {
      const preparedToolCall = prepareToolCallArguments(tool2, toolCall);
      const validatedArgs = validateToolArguments(tool2, preparedToolCall);
      if (config.beforeToolCall) {
        const beforeResult = await config.beforeToolCall({
          assistantMessage,
          toolCall,
          args: validatedArgs,
          context: currentContext
        }, signal);
        if (signal?.aborted) {
          return {
            kind: "immediate",
            result: createErrorToolResult("Operation aborted"),
            isError: true
          };
        }
        if (beforeResult?.block) {
          const result = createErrorToolResult(beforeResult.reason || "Tool execution was blocked");
          if (beforeResult.terminate === true) {
            result.terminate = true;
          }
          return {
            kind: "immediate",
            result,
            isError: true
          };
        }
      }
      if (signal?.aborted) {
        return {
          kind: "immediate",
          result: createErrorToolResult("Operation aborted"),
          isError: true
        };
      }
      return {
        kind: "prepared",
        toolCall,
        tool: tool2,
        args: validatedArgs
      };
    } catch (error) {
      return {
        kind: "immediate",
        result: createErrorToolResult(error instanceof Error ? error.message : String(error)),
        isError: true
      };
    }
  }
  async function executePreparedToolCall(prepared, signal, emit) {
    const updateEvents = [];
    let acceptingUpdates = true;
    try {
      const result = await prepared.tool.execute(prepared.toolCall.id, prepared.args, signal, (partialResult) => {
        if (!acceptingUpdates)
          return;
        updateEvents.push(Promise.resolve(emit({
          type: "tool_execution_update",
          toolCallId: prepared.toolCall.id,
          toolName: prepared.toolCall.name,
          args: prepared.toolCall.arguments,
          partialResult
        })));
      });
      acceptingUpdates = false;
      await Promise.all(updateEvents);
      return { result, isError: false };
    } catch (error) {
      acceptingUpdates = false;
      await Promise.all(updateEvents);
      return {
        result: createErrorToolResult(error instanceof Error ? error.message : String(error)),
        isError: true
      };
    } finally {
      acceptingUpdates = false;
    }
  }
  async function finalizeExecutedToolCall(currentContext, assistantMessage, prepared, executed, config, signal) {
    let result = executed.result;
    let isError = executed.isError;
    if (config.afterToolCall) {
      try {
        const afterResult = await config.afterToolCall({
          assistantMessage,
          toolCall: prepared.toolCall,
          args: prepared.args,
          result,
          isError,
          context: currentContext
        }, signal);
        if (afterResult) {
          result = {
            ...result,
            content: afterResult.content ?? result.content,
            details: afterResult.details ?? result.details,
            usage: afterResult.usage ?? result.usage,
            terminate: afterResult.terminate ?? result.terminate
          };
          isError = afterResult.isError ?? isError;
        }
      } catch (error) {
        result = createErrorToolResult(error instanceof Error ? error.message : String(error));
        isError = true;
      }
    }
    return {
      toolCall: prepared.toolCall,
      result,
      isError
    };
  }
  function createErrorToolResult(message) {
    return {
      content: [{ type: "text", text: message }],
      details: {}
    };
  }
  async function emitToolExecutionEnd(finalized, emit) {
    await emit({
      type: "tool_execution_end",
      toolCallId: finalized.toolCall.id,
      toolName: finalized.toolCall.name,
      result: finalized.result,
      isError: finalized.isError
    });
  }
  function createToolResultMessage(finalized) {
    return {
      role: "toolResult",
      toolCallId: finalized.toolCall.id,
      toolName: finalized.toolCall.name,
      // Untyped tools (JS extensions) can return results without content; normalize
      // so the null never enters session history or provider payloads.
      content: finalized.result.content ?? [],
      details: finalized.result.details,
      usage: finalized.result.usage,
      ...finalized.result.addedToolNames?.length ? { addedToolNames: finalized.result.addedToolNames } : {},
      isError: finalized.isError,
      timestamp: Date.now()
    };
  }
  async function emitToolResultMessage(toolResultMessage, emit) {
    await emit({ type: "message_start", message: toolResultMessage });
    await emit({ type: "message_end", message: toolResultMessage });
  }

  // runtime/node_modules/@earendil-works/pi-agent-core/dist/agent.js
  function defaultConvertToLlm(messages) {
    return messages.filter((message) => message.role === "user" || message.role === "assistant" || message.role === "toolResult");
  }
  var EMPTY_USAGE = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
  };
  var DEFAULT_MODEL = {
    id: "unknown",
    name: "unknown",
    api: "unknown",
    provider: "unknown",
    baseUrl: "",
    reasoning: false,
    input: [],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 0,
    maxTokens: 0
  };
  function createMutableAgentState(initialState) {
    let tools = initialState?.tools?.slice() ?? [];
    let messages = initialState?.messages?.slice() ?? [];
    return {
      systemPrompt: initialState?.systemPrompt ?? "",
      model: initialState?.model ?? DEFAULT_MODEL,
      thinkingLevel: initialState?.thinkingLevel ?? "off",
      get tools() {
        return tools;
      },
      set tools(nextTools) {
        tools = nextTools.slice();
      },
      get messages() {
        return messages;
      },
      set messages(nextMessages) {
        messages = nextMessages.slice();
      },
      isStreaming: false,
      streamingMessage: void 0,
      pendingToolCalls: /* @__PURE__ */ new Set(),
      errorMessage: void 0
    };
  }
  var PendingMessageQueue = class {
    constructor(mode) {
      __publicField(this, "messages", []);
      __publicField(this, "mode");
      this.mode = mode;
    }
    enqueue(message) {
      this.messages.push(message);
    }
    hasItems() {
      return this.messages.length > 0;
    }
    drain() {
      if (this.mode === "all") {
        const drained = this.messages.slice();
        this.messages = [];
        return drained;
      }
      const first = this.messages[0];
      if (!first) {
        return [];
      }
      this.messages = this.messages.slice(1);
      return [first];
    }
    clear() {
      this.messages = [];
    }
  };
  var Agent = class {
    constructor(options) {
      __publicField(this, "_state");
      __publicField(this, "listeners", /* @__PURE__ */ new Set());
      __publicField(this, "steeringQueue");
      __publicField(this, "followUpQueue");
      __publicField(this, "convertToLlm");
      __publicField(this, "transformContext");
      __publicField(this, "streamFunction");
      __publicField(this, "getApiKey");
      __publicField(this, "onPayload");
      __publicField(this, "onResponse");
      __publicField(this, "beforeToolCall");
      __publicField(this, "afterToolCall");
      __publicField(this, "shouldStopAfterTurn");
      __publicField(this, "prepareNextTurn");
      __publicField(this, "prepareNextTurnWithContext");
      __publicField(this, "activeRun");
      /** Session identifier forwarded to providers for cache-aware backends. */
      __publicField(this, "sessionId");
      /** Optional per-level thinking token budgets forwarded to the stream function. */
      __publicField(this, "thinkingBudgets");
      /** Preferred transport forwarded to the stream function. */
      __publicField(this, "transport");
      /** Optional cap for provider-requested retry delays. */
      __publicField(this, "maxRetryDelayMs");
      /** Tool execution strategy for assistant messages that contain multiple tool calls. */
      __publicField(this, "toolExecution");
      const runtimeOptions = options ?? {};
      this._state = createMutableAgentState(runtimeOptions.initialState);
      this.convertToLlm = runtimeOptions.convertToLlm ?? defaultConvertToLlm;
      this.transformContext = runtimeOptions.transformContext;
      this.streamFunction = runtimeOptions.streamFn ?? getDefaultStreamFn();
      this.getApiKey = runtimeOptions.getApiKey;
      this.onPayload = runtimeOptions.onPayload;
      this.onResponse = runtimeOptions.onResponse;
      this.beforeToolCall = runtimeOptions.beforeToolCall;
      this.afterToolCall = runtimeOptions.afterToolCall;
      this.shouldStopAfterTurn = runtimeOptions.shouldStopAfterTurn;
      this.prepareNextTurn = runtimeOptions.prepareNextTurn;
      this.prepareNextTurnWithContext = runtimeOptions.prepareNextTurnWithContext;
      this.steeringQueue = new PendingMessageQueue(runtimeOptions.steeringMode ?? "one-at-a-time");
      this.followUpQueue = new PendingMessageQueue(runtimeOptions.followUpMode ?? "one-at-a-time");
      this.sessionId = runtimeOptions.sessionId;
      this.thinkingBudgets = runtimeOptions.thinkingBudgets;
      this.transport = runtimeOptions.transport ?? "auto";
      this.maxRetryDelayMs = runtimeOptions.maxRetryDelayMs;
      this.toolExecution = runtimeOptions.toolExecution ?? "parallel";
    }
    /**
     * Subscribe to agent lifecycle events.
     *
     * Listener promises are awaited in subscription order and are included in
     * the current run's settlement. Listeners also receive the active abort
     * signal for the current run.
     *
     * `agent_end` is the final emitted event for a run, but the agent does not
     * become idle until all awaited listeners for that event have settled.
     */
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    /**
     * Current agent state.
     *
     * Assigning `state.tools` or `state.messages` copies the provided top-level array.
     */
    get state() {
      return this._state;
    }
    /** Controls how queued steering messages are drained. */
    set steeringMode(mode) {
      this.steeringQueue.mode = mode;
    }
    get steeringMode() {
      return this.steeringQueue.mode;
    }
    /** Controls how queued follow-up messages are drained. */
    set followUpMode(mode) {
      this.followUpQueue.mode = mode;
    }
    get followUpMode() {
      return this.followUpQueue.mode;
    }
    /** Queue a message to be injected after the current assistant turn finishes. */
    steer(message) {
      this.steeringQueue.enqueue(message);
    }
    /** Queue a message to run only after the agent would otherwise stop. */
    followUp(message) {
      this.followUpQueue.enqueue(message);
    }
    /** Remove all queued steering messages. */
    clearSteeringQueue() {
      this.steeringQueue.clear();
    }
    /** Remove all queued follow-up messages. */
    clearFollowUpQueue() {
      this.followUpQueue.clear();
    }
    /** Remove all queued steering and follow-up messages. */
    clearAllQueues() {
      this.clearSteeringQueue();
      this.clearFollowUpQueue();
    }
    /** Returns true when either queue still contains pending messages. */
    hasQueuedMessages() {
      return this.steeringQueue.hasItems() || this.followUpQueue.hasItems();
    }
    /** Active abort signal for the current run, if any. */
    get signal() {
      return this.activeRun?.abortController.signal;
    }
    /** Abort the current run, if one is active. */
    abort() {
      this.activeRun?.abortController.abort();
    }
    /**
     * Resolve when the current run and all awaited event listeners have finished.
     *
     * This resolves after `agent_end` listeners settle.
     */
    waitForIdle() {
      return this.activeRun?.promise ?? Promise.resolve();
    }
    /** Clear transcript state, runtime state, and queued messages. */
    reset() {
      if (this.activeRun) {
        throw new Error("Agent is already processing. Wait for completion before resetting.");
      }
      this._state.messages = [];
      this._state.isStreaming = false;
      this._state.streamingMessage = void 0;
      this._state.pendingToolCalls = /* @__PURE__ */ new Set();
      this._state.errorMessage = void 0;
      this.clearFollowUpQueue();
      this.clearSteeringQueue();
    }
    async prompt(input, images) {
      if (this.activeRun) {
        throw new Error("Agent is already processing a prompt. Use steer() or followUp() to queue messages, or wait for completion.");
      }
      const messages = this.normalizePromptInput(input, images);
      await this.runPromptMessages(messages);
    }
    /** Continue from the current transcript. The last message must be a user or tool-result message. */
    async continue() {
      if (this.activeRun) {
        throw new Error("Agent is already processing. Wait for completion before continuing.");
      }
      const lastMessage = this._state.messages[this._state.messages.length - 1];
      if (!lastMessage) {
        throw new Error("No messages to continue from");
      }
      if (lastMessage.role === "assistant") {
        const queuedSteering = this.steeringQueue.drain();
        if (queuedSteering.length > 0) {
          await this.runPromptMessages(queuedSteering, { skipInitialSteeringPoll: true });
          return;
        }
        const queuedFollowUps = this.followUpQueue.drain();
        if (queuedFollowUps.length > 0) {
          await this.runPromptMessages(queuedFollowUps);
          return;
        }
        throw new Error("Cannot continue from message role: assistant");
      }
      await this.runContinuation();
    }
    normalizePromptInput(input, images) {
      if (Array.isArray(input)) {
        return input;
      }
      if (typeof input !== "string") {
        return [input];
      }
      const content = [{ type: "text", text: input }];
      if (images && images.length > 0) {
        content.push(...images);
      }
      return [{ role: "user", content, timestamp: Date.now() }];
    }
    async runPromptMessages(messages, options = {}) {
      await this.runWithLifecycle(async (signal) => {
        await runAgentLoop(messages, this.createContextSnapshot(), this.createLoopConfig(options), (event) => this.processEvents(event), signal, this.streamFunction);
      });
    }
    async runContinuation() {
      await this.runWithLifecycle(async (signal) => {
        await runAgentLoopContinue(this.createContextSnapshot(), this.createLoopConfig(), (event) => this.processEvents(event), signal, this.streamFunction);
      });
    }
    createContextSnapshot() {
      return {
        systemPrompt: this._state.systemPrompt,
        messages: this._state.messages.slice(),
        tools: this._state.tools.slice()
      };
    }
    createLoopConfig(options = {}) {
      let skipInitialSteeringPoll = options.skipInitialSteeringPoll === true;
      const shouldStopAfterTurn = this.shouldStopAfterTurn;
      return {
        model: this._state.model,
        reasoning: this._state.thinkingLevel === "off" ? void 0 : this._state.thinkingLevel,
        sessionId: this.sessionId,
        onPayload: this.onPayload,
        onResponse: this.onResponse,
        transport: this.transport,
        thinkingBudgets: this.thinkingBudgets,
        maxRetryDelayMs: this.maxRetryDelayMs,
        toolExecution: this.toolExecution,
        beforeToolCall: this.beforeToolCall,
        afterToolCall: this.afterToolCall,
        shouldStopAfterTurn: shouldStopAfterTurn ? async (context) => await shouldStopAfterTurn(context, this.signal) : void 0,
        prepareNextTurn: this.prepareNextTurnWithContext || this.prepareNextTurn ? async (context) => {
          if (this.prepareNextTurnWithContext) {
            return await this.prepareNextTurnWithContext(context, this.signal);
          }
          return await this.prepareNextTurn?.(this.signal);
        } : void 0,
        convertToLlm: this.convertToLlm,
        transformContext: this.transformContext,
        getApiKey: this.getApiKey,
        getSteeringMessages: async () => {
          if (skipInitialSteeringPoll) {
            skipInitialSteeringPoll = false;
            return [];
          }
          return this.steeringQueue.drain();
        },
        getFollowUpMessages: async () => this.followUpQueue.drain()
      };
    }
    async runWithLifecycle(executor) {
      if (this.activeRun) {
        throw new Error("Agent is already processing.");
      }
      const abortController = new AbortController();
      let resolvePromise = () => {
      };
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      this.activeRun = { promise, resolve: resolvePromise, abortController };
      this._state.isStreaming = true;
      this._state.streamingMessage = void 0;
      this._state.errorMessage = void 0;
      try {
        await executor(abortController.signal);
      } catch (error) {
        await this.handleRunFailure(error, abortController.signal.aborted);
      } finally {
        this.finishRun();
      }
    }
    async handleRunFailure(error, aborted) {
      const failureMessage = {
        role: "assistant",
        content: [{ type: "text", text: "" }],
        api: this._state.model.api,
        provider: this._state.model.provider,
        model: this._state.model.id,
        usage: EMPTY_USAGE,
        stopReason: aborted ? "aborted" : "error",
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
      await this.processEvents({ type: "message_start", message: failureMessage });
      await this.processEvents({ type: "message_end", message: failureMessage });
      await this.processEvents({ type: "turn_end", message: failureMessage, toolResults: [] });
      await this.processEvents({ type: "agent_end", messages: [failureMessage] });
    }
    finishRun() {
      this._state.isStreaming = false;
      this._state.streamingMessage = void 0;
      this._state.pendingToolCalls = /* @__PURE__ */ new Set();
      this.activeRun?.resolve();
      this.activeRun = void 0;
    }
    /**
     * Reduce internal state for a loop event, then await listeners.
     *
     * `agent_end` only means no further loop events will be emitted. The run is
     * considered idle later, after all awaited listeners for `agent_end` finish
     * and `finishRun()` clears runtime-owned state.
     */
    async processEvents(event) {
      switch (event.type) {
        case "message_start":
          this._state.streamingMessage = event.message;
          break;
        case "message_update":
          this._state.streamingMessage = event.message;
          break;
        case "message_end":
          this._state.streamingMessage = void 0;
          this._state.messages.push(event.message);
          break;
        case "tool_execution_start": {
          const pendingToolCalls = new Set(this._state.pendingToolCalls);
          pendingToolCalls.add(event.toolCallId);
          this._state.pendingToolCalls = pendingToolCalls;
          break;
        }
        case "tool_execution_end": {
          const pendingToolCalls = new Set(this._state.pendingToolCalls);
          pendingToolCalls.delete(event.toolCallId);
          this._state.pendingToolCalls = pendingToolCalls;
          break;
        }
        case "turn_end":
          if (event.message.role === "assistant" && event.message.errorMessage) {
            this._state.errorMessage = event.message.errorMessage;
          }
          break;
        case "agent_end":
          this._state.streamingMessage = void 0;
          break;
      }
      const signal = this.activeRun?.abortController.signal;
      if (!signal) {
        throw new Error("Agent listener invoked outside active run");
      }
      for (const listener of this.listeners) {
        await listener(event, signal);
      }
    }
  };

  // runtime/src/agent-runtime.js
  if (!globalThis.TextEncoder) globalThis.TextEncoder = class {
    encode(value) {
      const binary = unescape(encodeURIComponent(String(value)));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
  };
  if (!globalThis.TextDecoder) globalThis.TextDecoder = class {
    decode(bytes) {
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return decodeURIComponent(escape(binary));
    }
  };
  if (!globalThis.structuredClone) globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
  if (!globalThis.queueMicrotask) globalThis.queueMicrotask = (fn) => Promise.resolve().then(fn);
  if (!globalThis.setTimeout) globalThis.setTimeout = (fn) => {
    Promise.resolve().then(fn);
    return 0;
  };
  if (!globalThis.clearTimeout) globalThis.clearTimeout = () => {
  };
  if (!globalThis.crypto) globalThis.crypto = {};
  if (!globalThis.crypto.randomUUID) globalThis.crypto.randomUUID = () => `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  var call = (method, payload = {}) => Promise.resolve(__agenriod_call_async(method, JSON.stringify(payload))).then((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  });
  var textResult = (text, details = void 0) => ({
    content: [{ type: "text", text: String(text) }],
    details
  });
  var schemas = {
    read: typebox_exports.Object({ path: typebox_exports.String(), offset: typebox_exports.Optional(typebox_exports.Number()), limit: typebox_exports.Optional(typebox_exports.Number()) }),
    write: typebox_exports.Object({ path: typebox_exports.String(), content: typebox_exports.String() }),
    edit: typebox_exports.Object({ path: typebox_exports.String(), oldText: typebox_exports.String(), newText: typebox_exports.String() }),
    grep: typebox_exports.Object({ pattern: typebox_exports.String(), path: typebox_exports.Optional(typebox_exports.String()), glob: typebox_exports.Optional(typebox_exports.String()), ignoreCase: typebox_exports.Optional(typebox_exports.Boolean()), literal: typebox_exports.Optional(typebox_exports.Boolean()), context: typebox_exports.Optional(typebox_exports.Number()), limit: typebox_exports.Optional(typebox_exports.Number()) }),
    find: typebox_exports.Object({ path: typebox_exports.Optional(typebox_exports.String()), pattern: typebox_exports.Optional(typebox_exports.String()), limit: typebox_exports.Optional(typebox_exports.Number()) }),
    ls: typebox_exports.Object({ path: typebox_exports.Optional(typebox_exports.String()) }),
    bash: typebox_exports.Object({ command: typebox_exports.String(), timeout: typebox_exports.Optional(typebox_exports.Number()) })
  };
  var tool = (name, description, parameters, method = name) => ({
    name,
    label: name,
    description,
    parameters,
    executionMode: name === "bash" ? "sequential" : "parallel",
    async execute(_id, args, signal, onUpdate) {
      if (signal?.aborted) throw new Error("Operation aborted");
      const result = await call(method, args);
      if (result?.error) throw new Error(result.error);
      if (result?.progress && onUpdate) onUpdate(textResult(result.progress));
      if (result?.image) {
        return { content: [{ type: "text", text: result.text ?? "Image attached" }, result.image], details: result.details };
      }
      return textResult(result?.text ?? result ?? "(no output)", result?.details);
    }
  });
  function pluginTools(plugins) {
    return (plugins ?? []).flatMap((plugin) => (plugin.tools ?? []).filter((item) => item.enabled !== false).map((item) => {
      const name = `plugin_${plugin.id}_${item.name}`.replace(/[^a-zA-Z0-9_]/g, "_");
      return {
        name,
        label: item.name,
        description: `${item.description ?? "Plugin tool"} (plugin: ${plugin.name})`,
        parametersForModel: item.parameters,
        // Plugin manifests may carry a JSON schema for documentation. Runtime
        // validation stays permissive so a manifest can evolve independently of
        // the bundled SDK; the host still validates the plugin id and command.
        parameters: typebox_exports.Any(),
        executionMode: "sequential",
        async execute(_id, args, signal) {
          if (signal?.aborted) throw new Error("Operation aborted");
          const result = await call("plugin", { pluginId: plugin.id, tool: item.name, args });
          if (result?.error) throw new Error(result.error);
          return textResult(result?.text ?? result ?? "(no output)");
        }
      };
    }));
  }
  var builtinTools = [
    tool("read", "Read a text or image file. Use offset and limit for large files.", schemas.read),
    tool("write", "Create or overwrite a file, creating parent directories.", schemas.write),
    tool("edit", "Replace an exact text occurrence in a file.", schemas.edit),
    tool("grep", "Search file contents for a regex or literal pattern.", schemas.grep),
    tool("find", "List files under a directory, optionally filtered by a glob pattern.", schemas.find),
    tool("ls", "List entries in a directory.", schemas.ls),
    tool("bash", "Run a bash-compatible shell command in the workspace.", schemas.bash)
  ];
  function responseMessage(model, response) {
    const base = {
      role: "assistant",
      api: model.api,
      provider: model.provider,
      model: model.id,
      usage: response.usage ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: response.stopReason ?? (response.toolCalls?.length ? "toolUse" : "stop"),
      timestamp: Date.now()
    };
    const content = [];
    if (response.thinking) content.push({ type: "thinking", thinking: response.thinking });
    if (response.text) content.push({ type: "text", text: response.text });
    for (const toolCall of response.toolCalls ?? []) {
      content.push({ type: "toolCall", id: toolCall.id ?? `call_${Date.now()}_${content.length}`, name: toolCall.name, arguments: toolCall.arguments ?? {} });
    }
    return { ...base, content };
  }
  function createStreamFunction() {
    return (model, context, options = {}) => {
      const stream = new AssistantMessageEventStream();
      (async () => {
        try {
          const response = await call("complete", { model, context });
          if (options.signal?.aborted) {
            const aborted = responseMessage(model, { text: "", stopReason: "aborted" });
            aborted.errorMessage = "Request was aborted";
            stream.push({ type: "error", reason: "aborted", error: aborted });
            stream.end(aborted);
            return;
          }
          const message = responseMessage(model, response ?? {});
          const partial = { ...message, content: [], stopReason: "pending" };
          stream.push({ type: "start", partial });
          for (let index3 = 0; index3 < message.content.length; index3++) {
            const block = message.content[index3];
            if (block.type === "thinking") {
              partial.content.push({ type: "thinking", thinking: block.thinking });
              stream.push({ type: "thinking_start", contentIndex: index3, partial: { ...partial } });
              stream.push({ type: "thinking_delta", contentIndex: index3, delta: block.thinking, partial: { ...partial } });
              stream.push({ type: "thinking_end", contentIndex: index3, content: block.thinking, partial: { ...partial } });
            } else if (block.type === "text") {
              partial.content.push({ type: "text", text: block.text });
              stream.push({ type: "text_start", contentIndex: index3, partial: { ...partial } });
              stream.push({ type: "text_delta", contentIndex: index3, delta: block.text, partial: { ...partial } });
              stream.push({ type: "text_end", contentIndex: index3, content: block.text, partial: { ...partial } });
            } else {
              partial.content.push({ type: "toolCall", id: block.id, name: block.name, arguments: block.arguments });
              stream.push({ type: "toolcall_start", contentIndex: index3, partial: { ...partial } });
              stream.push({ type: "toolcall_delta", contentIndex: index3, delta: JSON.stringify(block.arguments), partial: { ...partial } });
              stream.push({ type: "toolcall_end", contentIndex: index3, toolCall: block, partial: { ...partial } });
            }
          }
          stream.push({ type: "done", reason: message.stopReason, message });
          stream.end(message);
        } catch (error) {
          const message = responseMessage(model, { text: "", stopReason: "error" });
          message.errorMessage = error?.message ?? String(error);
          stream.push({ type: "error", reason: "error", error: message });
          stream.end(message);
        }
      })();
      return stream;
    };
  }
  var agent;
  var currentConfig;
  async function configure(config) {
    currentConfig = config;
    const plugins = await call("plugins");
    const model = config.model;
    agent = new Agent({
      streamFn: createStreamFunction(),
      initialState: { model, systemPrompt: config.systemPrompt ?? "", messages: config.initialMessages ?? [], tools: [...builtinTools, ...pluginTools(plugins)] },
      toolExecution: "sequential",
      beforeToolCall: async ({ toolCall, args }) => {
        const result = await call("hook", { event: "before_tool", tool: toolCall.name, args });
        return result?.block ? { block: true, reason: result.reason ?? "Blocked by hook" } : void 0;
      },
      afterToolCall: async ({ toolCall, result }) => {
        await call("hook", { event: "after_tool", tool: toolCall.name, result });
        return void 0;
      }
    });
    agent.subscribe((event) => {
      __agenriod_call("event", JSON.stringify({ ...event, sessionId: config.sessionId, runId: config.runId }));
    });
    return { model, tools: agent.state.tools.map((item) => item.name) };
  }
  globalThis.__agenriod_start = async (configJson) => configure(typeof configJson === "string" ? JSON.parse(configJson) : configJson);
  globalThis.__agenriod_prompt = async (promptJson) => {
    if (!agent) throw new Error("Agent is not configured");
    const input = typeof promptJson === "string" ? JSON.parse(promptJson) : promptJson;
    await agent.prompt(input.text, input.images ?? []);
    return { messages: agent.state.messages };
  };
  globalThis.__agenriod_abort = () => agent?.abort();
  globalThis.__agenriod_reset = () => agent?.reset();
  globalThis.__agenriod_history = () => agent?.state.messages ?? [];
})();
