(function (exports) {
  exports.validate = validate;
  exports.mixin = mixin;
  exports.ValidatorError = ValidatorError;

  //link to current `validate` options for getting it from places where they
  //do not passed directly (e.g. `error` function)
  var currentOptions = null;

  //
  // ### function validate (object, schema, options)
  // #### {Object} object the object to validate.
  // #### {Object} schema (optional) the JSON Schema to validate against.
  // #### {Object} options (optional) options controlling the validation
  //      process. See {@link #validate.defaults) for details.
  // Validate <code>object</code> against a JSON Schema.
  // If <code>object</code> is self-describing (i.e. has a
  // <code>$schema</code> property), it will also be validated
  // against the referenced schema. [TODO]: This behaviour bay be
  // suppressed by setting the {@link #validate.options.???}
  // option to <code>???</code>.[/TODO]
  //
  // If <code>schema</code> is not specified, and <code>object</code>
  // is not self-describing, validation always passes.
  //
  // <strong>Note:</strong> in order to pass options but no schema,
  // <code>schema</code> <em>must</em> be specified in the call to
  // <code>validate()</code>; otherwise, <code>options</code> will
  // be interpreted as the schema. <code>schema</code> may be passed
  // as <code>null</code>, <code>undefinded</code>, or the empty object
  // (<code>{}</code>) in this case.
  //
  function validate(object, schema, options) {
    options = mixin({}, validate.defaults, options);
    currentOptions = options;
    var errors = [];
    try {
      validateObject(object, schema, options, errors);
    } catch(err) {
      if (options.failOnFirstError || !(err instanceof ValidatorError)) {
        throw err;
      }
    }

    //
    // TODO: self-described validation
    // if (! options.selfDescribing) { ... }
    //

    return {
      valid: !(errors.length),
      errors: errors
    };
  };

  /**
   * Default validation options. Defaults can be overridden by
   * passing an 'options' hash to {@link #validate}. They can
   * also be set globally be changing the values in
   * <code>validate.defaults</code> directly.
   */
  validate.defaults = {
      /**
       * <p>
       * Enforce 'format' constraints.
       * </p><p>
       * <em>Default: <code>true</code></em>
       * </p>
       */
      validateFormats: true,
      /**
       * <p>
       * When {@link #validateFormats} is <code>true</code>,
       * treat unrecognized formats as validation errors.
       * </p><p>
       * <em>Default: <code>false</code></em>
       * </p>
       *
       * @see validation.formats for default supported formats.
       */
      validateFormatsStrict: false,
      /**
       * <p>
       * When {@link #validateFormats} is <code>true</code>,
       * also validate formats defined in {@link #validate.formatExtensions}.
       * </p><p>
       * <em>Default: <code>true</code></em>
       * </p>
       */
      validateFormatExtensions: true,
      /** Enforce casting of some types */
      cast: false,
      /** Default value for object `additionalProperties` attribute */
      additionalProperties: true,
      /** Apply casting (see `cast` option above) to source object */
      castSource: false,
      /** Apply value  of `default` attribute to source object */
      applyDefaultValue: false,
      /** If true value of `default` attribute will be checked to conforms schema */
      validateDefaultValue: false,
      /** Validation will be stopped after first error occurred */
      exitOnFirstError: false,
      /** Like `exitOnFirstError` option but error will be thrown */
      failOnFirstError: false
  };

  /**
   * Default messages to include with validation errors.
   */
  validate.messages = {
      required:         "is required",
      minLength:        "is too short (minimum is %{expected} characters)",
      maxLength:        "is too long (maximum is %{expected} characters)",
      pattern:          "invalid input",
      minimum:          "must be greater than or equal to %{expected}",
      maximum:          "must be less than or equal to %{expected}",
      exclusiveMinimum: "must be greater than %{expected}",
      exclusiveMaximum: "must be less than %{expected}",
      divisibleBy:      "must be divisible by %{expected}",
      minItems:         "must contain more than %{expected} items",
      maxItems:         "must contain less than %{expected} items",
      uniqueItems:      "must hold a unique set of values",
      format:           "is not a valid %{expected}",
      conform:          "must conform to given constraint",
      type:             "must be of %{expected} type"
  };
  validate.messages['enum'] = "must be present in given enumerator";

  /**
   *
   */
  validate.formats = {
    'email':          /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
    'ip-address':     /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i,
    'ipv6':           /^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}$/,
    'date-time':      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:.\d{1,3})?Z$/,
    'date':           /^\d{4}-\d{2}-\d{2}$/,
    'time':           /^\d{2}:\d{2}:\d{2}$/,
    'color':          /^(#([0-9a-f]{3}){1,2}|rgb\((\s*(\d{1,2}|[01][0-9][0-9]|2[0-4][0-9]|25[0-5])\s*,){2}\s*(\d{1,2}|[01][0-9][0-9]|2[0-4][0-9]|25[0-5])\s*\)|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow)$/i,
    //'style':        (not supported)
    //'phone':        (not supported)
    //'uri':          (not supported)
    'host-name':      /^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])/,
    'utc-millisec':   {
      test: function (value) {
        return typeof(value) === 'number' && value >= 0;
      }
    },
    'regex':          {
      test: function (value) {
        try { new RegExp(value) }
        catch (e) { return false }

        return true;
      }
    }
  };

  /**
   *
   */
  validate.formatExtensions = {
    'url': /^(https?|ftp|git):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
  };

  /** filters which can be used at `filter` attribute */
  validate.filters = {
  };

  function mixin(obj) {
    var sources = Array.prototype.slice.call(arguments, 1);
    while (sources.length) {
      var source = sources.shift();
      if (!source) { continue }

      if (typeof(source) !== 'object') {
        throw new TypeError('mixin non-object');
      }

      for (var p in source) {
        if (source.hasOwnProperty(p)) {
          obj[p] = source[p];
        }
      }
    }

    return obj;
  };

  function validateObject(object, schema, options, errors) {
    var props, allProps = Object.keys(object),
        visitedProps = [];

    // see 5.2
    if (schema.properties) {
      props = schema.properties;
      for (var p in props) {
        if (props.hasOwnProperty(p)) {
          visitedProps.push(p);
          validateProperty(object, object[p], p, props[p], options, errors);
        }
      }
    }

    // see 5.3
    if (schema.patternProperties) {
      props = schema.patternProperties;
      for (var p in props) {
        if (props.hasOwnProperty(p)) {
          var re = new RegExp(p);

          // Find all object properties that are matching `re`
          for (var k in object) {
            if (object.hasOwnProperty(k)) {
              visitedProps.push(k);
              if (re.exec(k) !== null) {
                validateProperty(object, object[k], p, props[p], options, errors);
              }
            }
          }
        }
      }
    }

    //if additionalProperties is not defined set default value
    if (schema.additionalProperties === undefined) {
      schema.additionalProperties = options.additionalProperties;
    }
    // see 5.4
    if (undefined !== schema.additionalProperties) {
      var i, l;

      var unvisitedProps = allProps.filter(function(k){
        return -1 === visitedProps.indexOf(k);
      });

      // Prevent additional properties; each unvisited property is therefore an error
      if (schema.additionalProperties === false && unvisitedProps.length > 0) {
        for (i = 0, l = unvisitedProps.length; i < l; i++) {
          error("additionalProperties", unvisitedProps[i], object[unvisitedProps[i]], false, errors);
        }
      }
      // additionalProperties is a schema and validate unvisited properties against that schema
      else if (typeof schema.additionalProperties == "object" && unvisitedProps.length > 0) {
        for (i = 0, l = unvisitedProps.length; i < l; i++) {
          validateProperty(object, object[unvisitedProps[i]], unvisitedProps[i], schema.additionalProperties, options, errors);
        }
      }
    }

  };

  //NOTICE: `indexInArray` should be integer if property is an `array` or null otherwise
  //If we will have nested array and cast property we have to make changes on correct level
  function validateProperty(object, value, property, schema, options, errors, indexInArray, array) {
    var valid,
        type;

    function constrain(name, value, assert) {
      if (schema[name] !== undefined && !assert(value, schema[name])) {
        error(name, property, value, schema, errors);
      }
    }

    //validate default value
    if (options.validateDefaultValue && schema['default'] !== undefined &&
        property != 'default') {
      validateProperty(schema, schema['default'], 'default', schema, options, errors);
    }

    if (value === undefined) {
      //apply default value if have an option and default value
      if (options.applyDefaultValue && schema['default'] !== undefined) {
        value = schema['default'];
        object[property] = value;
        return;
      } else if (schema.required) {
        var required = schema.required;
        if (typeof required === 'function') {
          required = required(object, property);
        }
        if (required && schema.type !== 'any') {
          return error('required', property, undefined, schema, errors);
        } else {
          return;
        }
      } else {
        return;
      }
    }

    if (options.cast) {
      if (('integer' === schema.type || 'number' === schema.type) && value == +value) {
        value = +value;
      }

      if ('boolean' === schema.type) {
        if ('true' === value || '1' === value || 1 === value) {
          value = true;
        }

        if ('false' === value || '0' === value || 0 === value) {
          value = false;
        }
      }

      if ('date' === schema.type) {
        value = new Date(value);
      }
      //modify source object if we have an option and values are differ
      //for simple value
      if (options.castSource && indexInArray == null && object[property] !== value) {
        object[property] = value;
      } else
        if (options.castSource && indexInArray != null && array[indexInArray] !== value) {
          //and for an array
          array[indexInArray] = value;
        }
    }

    if (schema['enum'] && schema['enum'].indexOf(value) === -1) {
      error('enum', property, value, schema, errors);
    }

    // Dependencies (see 5.8)
    if (typeof schema.dependencies === 'string' &&
        object[schema.dependencies] === undefined) {
      error('dependencies', property, null, schema, errors);
    }

    if (isArray(schema.dependencies)) {
      for (var i = 0, l = schema.dependencies.length; i < l; i++) {
        if (object[schema.dependencies[i]] === undefined) {
          error('dependencies', property, null, schema, errors);
        }
      }
    }

    if (typeof schema.dependencies === 'object') {
      var oldAdditionalProperties = options.additionalProperties;
      options.additionalProperties = true;
      validateObject(object, schema.dependencies, options, errors);
      options.additionalProperties = oldAdditionalProperties;
    }

    checkType(value, schema.type, function(err, type) {
      var errorsCountBeforeCheckType = errors.length;
      if (err) return error('type', property, typeof value, schema, errors);

      constrain('conform', value, function (a, e) { return e(a, object, property) });

      switch (type || (isArray(value) ? 'array' : typeof value)) {
        case 'string':
          constrain('minLength', value.length, function (a, e) { return a >= e });
          constrain('maxLength', value.length, function (a, e) { return a <= e });
          constrain('pattern',   value,        function (a, e) {
            e = typeof e === 'string'
              ? e = new RegExp(e)
              : e;
            return e.test(a)
          });
          if (options.validateFormats) {
            constrain('format', value, function(value, format) {
              var spec;
              if (options.validateFormatExtensions) {
                spec = validate.formatExtensions[format];
              }
              if (!spec) {
                spec = validate.formats[format];
              }
              if (spec) {
                return spec.test(value);
              } else {
                return !options.validateFormatsStrict;
              }
            });
          }
          break;
        case 'integer':
        case 'number':
          constrain('minimum',     value, function (a, e) { return a >= e });
          constrain('maximum',     value, function (a, e) { return a <= e });
          constrain('exclusiveMinimum', value, function (a, e) { return a > e });
          constrain('exclusiveMaximum', value, function (a, e) { return a < e });
          constrain('divisibleBy', value, function (a, e) {
            var multiplier = Math.max((a - Math.floor(a)).toString().length - 2, (e - Math.floor(e)).toString().length - 2);
            multiplier = multiplier > 0 ? Math.pow(10, multiplier) : 1;
            return (a * multiplier) % (e * multiplier) === 0
          });
          break;
        case 'array':
          constrain('items', value, function (a, e) {
            for (var i = 0, l = a.length; i < l; i++) {
              validateProperty(object, a[i], property, e, options, errors, i, a);
            }
            return true;
          });
          constrain('minItems', value, function (a, e) { return a.length >= e });
          constrain('maxItems', value, function (a, e) { return a.length <= e });
          constrain('uniqueItems', value, function (a) {
            var h = {};

            for (var i = 0, l = a.length; i < l; i++) {
              var key = JSON.stringify(a[i]);
              if (h[key]) return false;
              h[key] = true;
            }

            return true;
          });
          break;
        case 'object':
          // Recursive validation
          if (schema.properties || schema.patternProperties || schema.additionalProperties) {
            validateObject(value, schema, options, errors);
          }
          break;
      }

      //schema filtering
      if (schema.filter && errorsCountBeforeCheckType == errors.length) {
        if (type != 'array' && type != 'object') {
          var filters = isArray(schema.filter) ? schema.filter : [schema.filter];
          for (var i = 0, l = filters.length; i < l; i++) {
            var filter = null;
            if (isString(filters[i])) {
              if (filters[i] in validate.filters) {
                filter = validate.filters[filters[i]];
              } else {
                return error('filter', property, filters[i], schema, errors, 'unknown filter: %{actual}');
              }
            } else if (isFunction(filters[i])) {
              filter = filters[i];
            } else {
              return error('filter', property, typeof filters[i], schema, errors, 'bad filter type: %{actual}');
            }
            try {
              // filter value for simple value or for an array item
              if (indexInArray == null) {
                object[property] = filter(object[property]);  
              } else {
                object[property][indexInArray] = filter(object[property][indexInArray]);
              }
            } catch(err) {
              return error('filter', property, err, schema, errors, 'error during filtering: %{actual}');
            }
          }
        } else {
          return error('filter', property, type, schema, errors, 'bad property type for filtering: %{actual}');
        }
      }
    });
  };

  function checkType(val, type, callback) {
    var result = false,
        types = isArray(type) ? type : [type];

    // No type - no check
    if (type === undefined) return callback(null, type);

    // Go through available types
    // And fine first matching
    for (var i = 0, l = types.length; i < l; i++) {
      type = types[i].toLowerCase().trim();
      if (type === 'string' ? typeof val === 'string' :
          type === 'array' ? isArray(val) :
          type === 'object' ? val && typeof val === 'object' &&
                             !isArray(val) :
          type === 'number' ? typeof val === 'number' :
          type === 'integer' ? typeof val === 'number' && Math.floor(val) === val :
          type === 'null' ? val === null :
          type === 'boolean' ? typeof val === 'boolean' :
          type === 'date' ? isDate(val) :
          type === 'any' ? typeof val !== 'undefined' : false) {
        return callback(null, type);
      }
    };

    callback(true);
  };

  function error(attribute, property, actual, schema, errors, message) {
    var lookup = { expected: schema[attribute], attribute: attribute, property: property, actual: actual };
    var message = message || schema.messages && schema.messages[attribute] || schema.message || validate.messages[attribute] || "no default message";
    message = message.replace(/%\{([a-z]+)\}/ig, function (_, match) { return lookup[match.toLowerCase()] || ''; });
    var errorInfo = {
      attribute: attribute,
      property:  property,
      expected:  schema[attribute],
      actual:    actual,
      message:   message
    };
    errors.push(errorInfo);

    if (currentOptions.exitOnFirstError || currentOptions.failOnFirstError) {
      var err;
      if (errorInfo.attribute === 'required' ||
              errorInfo.attribute === 'type' ||
              errorInfo.attribute === 'minLength' ||
              errorInfo.attribute === 'maxLength') {
        err = new ValidatorError(
          'Property "' + errorInfo.property + '" ' + errorInfo.message
        );
      } else if (errorInfo.attribute === 'enum') {
        err = new ValidatorError(
          'Property "' + errorInfo.property + '" ' + errorInfo.message + ': ' +
          JSON.stringify(errorInfo.expected) + ', actual value "' + errorInfo.actual + '"'
        );
      } else if (errorInfo.attribute === 'additionalProperties') {
        err = new ValidatorError(
          'Property "' + errorInfo.property + '" is unexpected'
        );
      } else if (errorInfo.attribute === 'minimum' ||
              errorInfo.attribute === 'maximum') {
        err = new ValidatorError(
          'Property "' + errorInfo.property + '" ' + errorInfo.message +
          ', actual value "' + errorInfo.actual + '"'
        );
      }else {
        err = new ValidatorError(
          'Attribute `' + errorInfo.attribute + '` of property `' +
          errorInfo.property + '` hasn`t pass check, expected value: `' +
          errorInfo.expected + '` actual value: `' + errorInfo.actual + '` ' +
          'error message: `' + errorInfo.message + '`'
        );
      }
      err.info = errorInfo;
      throw err;
    }
  };

  function isArray(value) {
    var s = typeof value;
    if (s === 'object') {
      if (value) {
        if (typeof value.length === 'number' &&
           !(value.propertyIsEnumerable('length')) &&
           typeof value.splice === 'function') {
           return true;
        }
      }
    }
    return false;
  }

  function isFunction(value) {
    return Object.prototype.toString.call(value) == '[object Function]';
  }

  function isString(value) {
    return Object.prototype.toString.call(value) == '[object String]';
  }

  function isDate(value) {
    return Object.prototype.toString.call(value) == '[object Date]' &&
      value && value.getTime && isFunction(value.getTime) && !isNaN(value.getTime());
  }

  function ValidatorError(message) {
    Error.apply(this, arguments);
    this.name = 'ValidatorError';
    this.message = message;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this);
    } else {
      this.stack = (new Error()).stack;
    }
  }
  ValidatorError.prototype = new Error();

})(typeof(window) === 'undefined' ? module.exports : (window.json = window.json || {}));
