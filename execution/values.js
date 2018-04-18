'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getVariableValues = getVariableValues;
exports.getArgumentValues = getArgumentValues;
exports.getDirectiveValues = getDirectiveValues;

var _error = require('../error');

var _find = require('../jsutils/find');

var _find2 = _interopRequireDefault(_find);

var _invariant = require('../jsutils/invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _keyMap = require('../jsutils/keyMap');

var _keyMap2 = _interopRequireDefault(_keyMap);

var _coerceValue = require('../utilities/coerceValue');

var _typeFromAST = require('../utilities/typeFromAST');

var _valueFromAST = require('../utilities/valueFromAST');

var _kinds = require('../language/kinds');

var _printer = require('../language/printer');

var _definition = require('../type/definition');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Prepares an object map of variableValues of the correct type based on the
 * provided variable definitions and arbitrary input. If the input cannot be
 * parsed to match the variable definitions, a GraphQLError will be thrown.
 *
 * Note: The returned value is a plain Object with a prototype, since it is
 * exposed to user code. Care should be taken to not pull values from the
 * Object prototype.
 */
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *  strict
 */

function getVariableValues(schema, varDefNodes, inputs) {
  var errors = [];
  var coercedValues = {};

  var _loop = function _loop(i) {
    var varDefNode = varDefNodes[i];
    var varName = varDefNode.variable.name.value;
    var varType = (0, _typeFromAST.typeFromAST)(schema, varDefNode.type);
    if (!(0, _definition.isInputType)(varType)) {
      // Must use input types for variables. This should be caught during
      // validation, however is checked again here for safety.
      errors.push(new _error.GraphQLError('Variable "$' + varName + '" expected value of type ' + ('"' + (0, _printer.print)(varDefNode.type) + '" which cannot be used as an input type.'), [varDefNode.type]));
    } else {
      var hasValue = hasOwnProperty(inputs, varName);
      var value = hasValue ? inputs[varName] : undefined;
      if (!hasValue && varDefNode.defaultValue) {
        // If no value was provided to a variable with a default value,
        // use the default value.
        coercedValues[varName] = (0, _valueFromAST.valueFromAST)(varDefNode.defaultValue, varType);
      } else if ((!hasValue || value === null) && (0, _definition.isNonNullType)(varType)) {
        // If no value or a nullish value was provided to a variable with a
        // non-null type (required), produce an error.
        errors.push(new _error.GraphQLError(hasValue ? 'Variable "$' + varName + '" of non-null type ' + ('"' + String(varType) + '" must not be null.') : 'Variable "$' + varName + '" of required type ' + ('"' + String(varType) + '" was not provided.'), [varDefNode]));
      } else if (hasValue) {
        if (value === null) {
          // If the explicit value `null` was provided, an entry in the coerced
          // values must exist as the value `null`.
          coercedValues[varName] = null;
        } else {
          // Otherwise, a non-null value was provided, coerce it to the expected
          // type or report an error if coercion fails.
          var _coerced = (0, _coerceValue.coerceValue)(value, varType, varDefNode);
          var coercionErrors = _coerced.errors;
          if (coercionErrors) {
            coercionErrors.forEach(function (error) {
              error.message = 'Variable "$' + varName + '" got invalid ' + ('value ' + JSON.stringify(value) + '; ' + error.message);
            });
            errors.push.apply(errors, coercionErrors);
          } else {
            coercedValues[varName] = _coerced.value;
          }
        }
      }
    }
  };

  for (var i = 0; i < varDefNodes.length; i++) {
    _loop(i);
  }
  return errors.length === 0 ? { errors: undefined, coerced: coercedValues } : { errors: errors, coerced: undefined };
}

/**
 * Prepares an object map of argument values given a list of argument
 * definitions and list of argument AST nodes.
 *
 * Note: The returned value is a plain Object with a prototype, since it is
 * exposed to user code. Care should be taken to not pull values from the
 * Object prototype.
 */
function getArgumentValues(def, node, variableValues) {
  var coercedValues = {};
  var argDefs = def.args;
  var argNodes = node.arguments;
  if (!argDefs || !argNodes) {
    return coercedValues;
  }
  var argNodeMap = (0, _keyMap2.default)(argNodes, function (arg) {
    return arg.name.value;
  });
  for (var i = 0; i < argDefs.length; i++) {
    var argDef = argDefs[i];
    var name = argDef.name;
    var argType = argDef.type;
    var argumentNode = argNodeMap[name];
    var hasValue = void 0;
    var isNull = void 0;
    if (argumentNode && argumentNode.value.kind === _kinds.Kind.VARIABLE) {
      var variableName = argumentNode.value.name.value;
      hasValue = variableValues && hasOwnProperty(variableValues, variableName);
      isNull = variableValues && variableValues[variableName] === null;
    } else {
      hasValue = argumentNode != null;
      isNull = argumentNode && argumentNode.value.kind === _kinds.Kind.NULL;
    }

    if (!hasValue && argDef.defaultValue !== undefined) {
      // If no argument was provided where the definition has a default value,
      // use the default value.
      coercedValues[name] = argDef.defaultValue;
    } else if ((!hasValue || isNull) && (0, _definition.isNonNullType)(argType)) {
      // If no argument or a null value was provided to an argument with a
      // non-null type (required), produce a field error.
      if (isNull) {
        throw new _error.GraphQLError('Argument "' + name + '" of non-null type "' + String(argType) + '" ' + 'must not be null.', [argumentNode.value]);
      } else if (argumentNode && argumentNode.value.kind === _kinds.Kind.VARIABLE) {
        var _variableName = argumentNode.value.name.value;
        throw new _error.GraphQLError('Argument "' + name + '" of required type "' + String(argType) + '" ' + ('was provided the variable "$' + _variableName + '" ') + 'which was not provided a runtime value.', [argumentNode.value]);
      } else {
        throw new _error.GraphQLError('Argument "' + name + '" of required type "' + String(argType) + '" ' + 'was not provided.', [node]);
      }
    } else if (hasValue) {
      if (argumentNode.value.kind === _kinds.Kind.NULL) {
        // If the explicit value `null` was provided, an entry in the coerced
        // values must exist as the value `null`.
        coercedValues[name] = null;
      } else if (argumentNode.value.kind === _kinds.Kind.VARIABLE) {
        var _variableName2 = argumentNode.value.name.value;
        !variableValues ? (0, _invariant2.default)(0, 'Must exist for hasValue to be true.') : void 0;
        // Note: This does no further checking that this variable is correct.
        // This assumes that this query has been validated and the variable
        // usage here is of the correct type.
        coercedValues[name] = variableValues[_variableName2];
      } else {
        var valueNode = argumentNode.value;
        var coercedValue = (0, _valueFromAST.valueFromAST)(valueNode, argType, variableValues);
        if (coercedValue === undefined) {
          // Note: ValuesOfCorrectType validation should catch this before
          // execution. This is a runtime check to ensure execution does not
          // continue with an invalid argument value.
          throw new _error.GraphQLError('Argument "' + name + '" has invalid value ' + (0, _printer.print)(valueNode) + '.', [argumentNode.value]);
        }
        coercedValues[name] = coercedValue;
      }
    }
  }
  return coercedValues;
}

/**
 * Prepares an object map of argument values given a directive definition
 * and a AST node which may contain directives. Optionally also accepts a map
 * of variable values.
 *
 * If the directive does not exist on the node, returns undefined.
 *
 * Note: The returned value is a plain Object with a prototype, since it is
 * exposed to user code. Care should be taken to not pull values from the
 * Object prototype.
 */
function getDirectiveValues(directiveDef, node, variableValues) {
  var directiveNode = node.directives && (0, _find2.default)(node.directives, function (directive) {
    return directive.name.value === directiveDef.name;
  });

  if (directiveNode) {
    return getArgumentValues(directiveDef, directiveNode, variableValues);
  }
}

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}