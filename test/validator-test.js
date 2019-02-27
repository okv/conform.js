var assert = require('assert'),
    vows = require('vows'),
    revalidator = require('../lib/revalidator');

function clone(object) {
  return Object.keys(object).reduce(function (obj, k) {
    obj[k] = object[k];
    return obj;
  }, {});
};


function assertInvalid(res) {
  assert.isObject(res);
  assert.strictEqual(res.valid, false);
}

function assertValid(res) {
  assert.isObject(res);
  assert.strictEqual(res.valid, true);
}

function assertHasError(attr, field) {
  return function (res) {
    assert.notEqual(res.errors.length, 0);
    assert.ok(res.errors.some(function (e) {
      return e.attribute === attr && (field ? e.property === field : true);
    }));
  };
}

function assertHasErrorMsg(attr, msg) {
  return function (res) {
    assert.notEqual(res.errors.length, 0);
    assert.ok(res.errors.some(function (e) {
      return e.attribute === attr && e.message === msg;
    }));
  };
}

function assertValidates(passingValue, failingValue, attributes) {
  var schema = {
    name: 'Resource',
    properties: { field: {} }
  };

  var failing;

  if (!attributes) {
    attributes = failingValue;
    failing = false;
  } else {
    failing = true;
  }

  var attr = Object.keys(attributes)[0];
  revalidator.mixin(schema.properties.field, attributes);

  var result = {
    "when the object conforms": {
      topic: function () {
        return revalidator.validate({ field: passingValue }, schema);
      },
      "return an object with `valid` set to true": assertValid
    }
  };

  if (failing) {
    result["when the object does not conform"] ={
      topic: function () {
        return revalidator.validate({ field: failingValue }, schema);
      },
      "return an object with `valid` set to false": assertInvalid,
      "and an error concerning the attribute":      assertHasError(Object.keys(attributes)[0], 'field')
    };
  };

  return result;
}

vows.describe('revalidator', {
  "Validating": {
    "with <type>:'string'":       assertValidates ('hello',   42,        { type: "string" }),
    "with <type>:'number'":       assertValidates (42,       'hello',    { type: "number" }),
    "with <type>:'integer'":      assertValidates (42,        42.5,      { type: "integer" }),
    "with <type>:'integer' and big value":      assertValidates (10000000000,        10000000000.5,      { type: "integer" }),
    "with <type>:'array'":        assertValidates ([4, 2],   'hi',       { type: "array" }),
    "with <type>:'object'":       assertValidates ({},        [],        { type: "object" }),
    "with <type>:'boolean'":      assertValidates (false,     42,        { type: "boolean" }),
    "with <types>:bool,num":      assertValidates (false,     'hello',   { type: ["boolean", "number"] }),
    "with <types>:bool,num":      assertValidates (544,       null,      { type: ["boolean", "number"] }),
    "with <type>:'null'":         assertValidates (null,      false,     { type: "null" }),
    "with <type>:'date'":         assertValidates (new Date(),false,     { type: "date" }),
    "with <type>:'any'":          assertValidates (9,                    { type: "any" }),
    "with <pattern>":             assertValidates ("kaboom", "42",       { pattern: /^[a-z]+$/ }),
    "with <maxLength>":           assertValidates ("boom",   "kaboom",   { maxLength: 4 }),
    "with <minLength>":           assertValidates ("kaboom", "boom",     { minLength: 6 }),
    "with <minimum>":             assertValidates ( 512,      43,        { minimum:   473 }),
    "with <maximum>":             assertValidates ( 512,      1949,      { maximum:   678 }),
    "with <divisibleBy>":         assertValidates ( 10,       9,         { divisibleBy: 5 }),
    "with <divisibleBy> decimal": assertValidates ( 0.2,      0.009,     { divisibleBy: 0.01 }),
    "with <enum>":                assertValidates ("orange",  "cigar",   { enum: ["orange", "apple", "pear"] }),
    "with <format>:'url'":        assertValidates ('http://test.com/', 'hello', { format: 'url' }),
    "with <format>:'color' hex-short":      assertValidates ('#abc', '#abcd', { format: 'color' }),
    "with <format>:'color' hex":	assertValidates ('#666ade', '#abcdks', { format: 'color' }),
    "with <format>:'color' rgb":	assertValidates ('rgb(255,0, 123)', 'rgb(0, 256, 1)', { format: 'color' }),
    "with <format>:'color' word":	assertValidates ('yellow', 'yyelow', { format: 'color' }),
    "with <type>:'array' and <format>:'url'": assertValidates('http://test.com/', '1ello', {format: 'url', type: ['string', 'null']}),
    "with <type>:'array' and <format>:'url'": assertValidates(null, '1ello', {format: 'url', type: ['string', 'null']}),
    "with <dependencies>": {
      topic: {
        properties: {
          town:    { dependencies: "country" },
          country: { }
        }
      },
      "when the object conforms": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna", country: "moon" }, schema);
        },
        "return an object with `valid` set to true": assertValid
      },
      "when the object does not conform": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna" }, schema);
        },
        "return an object with `valid` set to false": assertInvalid,
        "and an error concerning the attribute":      assertHasError('dependencies')
      }
    },
    "with <dependencies> as array": {
      topic: {
        properties: {
          town:    { dependencies: ["country", "planet"] },
          country: { },
          planet: { }
        }
      },
      "when the object conforms": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna", country: "moon", planet: "mars" }, schema);
        },
        "return an object with `valid` set to true": assertValid
      },
      "when the object does not conform": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna", planet: "mars" }, schema);
        },
        "return an object with `valid` set to false": assertInvalid,
        "and an error concerning the attribute":      assertHasError('dependencies')
      }
    },
    "with <dependencies> as schema": {
      topic: {
        properties: {
          town:    {
            type: 'string',
            dependencies: {
              properties: { x: { type: "number" } }
            }
          },
          country: { }
        }
      },
      "when the object conforms": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna", x: 1 }, schema);
        },
        "return an object with `valid` set to true": assertValid,
      },
      "when the object does not conform": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna", x: 'no' }, schema);
        },
        "return an object with `valid` set to false": assertInvalid
      }
    },
    "with <type>:'integer' and": {
      "<minimum> constraints":      assertValidates ( 512,      43,        { minimum:   473, type: 'integer' }),
      "<maximum> constraints":      assertValidates ( 512,      1949,      { maximum:   678, type: 'integer' }),
      "<divisibleBy> constraints":  assertValidates ( 10,       9,         { divisibleBy: 5, type: 'integer' })
    },
    "with <additionalProperties>:false": {
      topic: {
        properties: {
          town: { type: 'string' }
        },
        additionalProperties: false
      },
      "when the object conforms": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna" }, schema);
        },
        "return an object with `valid` set to true": assertValid
      },
      "when the object does not conform": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna", area: 'park' }, schema);
        },
        "return an object with `valid` set to false": assertInvalid
      }
    },
    "with option <additionalProperties>:false": {
      topic: {
        properties: {
          town: { type: 'string' }
        }
      },
      "when the object conforms": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna" }, schema, {additionalProperties: false});
        },
        "return an object with `valid` set to true": assertValid
      },
      "when the object does not conform": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna", area: 'park' }, schema, {additionalProperties: false});
        },
        "return an object with `valid` set to false": assertInvalid
      },
      "but overridden to true at schema": {
        topic: {
          properties: {
            town: { type: 'string' }
          },
          additionalProperties: true
        },
        "when the object does not conform": {
          topic: function (schema) {
            return revalidator.validate({ town: "luna", area: 'park' }, schema, {additionalProperties: false});
          },
          "return an object with `valid` set to true": assertValid
        }
      }
    },
    "with <additionalProperties> schema": {
      topic: {
        properties: {
          town: { type: 'string' }
        },
        additionalProperties: {
          type: 'number'
        }
      },
      "when the object conforms": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna", area: 10.5 }, schema);
        },
        "return an object with `valid` set to true": assertValid
      },
      "when the object does not conform": {
        topic: function (schema) {
          return revalidator.validate({ town: "luna", area: 'park' }, schema);
        },
        "return an object with `valid` set to false": assertInvalid
      }
    }
  }
}).addBatch({
  "A schema": {
    topic: {
      name: 'Article',
      properties: {
        title: {
          type: 'string',
          maxLength: 140,
          conditions: {
            optional: function () {
              return !this.published;
            }
          }
        },
        date: { type: 'string', format: 'date', messages: { format: "must be a valid %{expected} and nothing else" } },
        body: { type: 'string' },
        tags: {
          type: 'array',
          uniqueItems: true,
          minItems: 2,
          items: {
            type: 'string',
            pattern: /[a-z ]+/
          }
        },
        tuple: {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: {
            type: ['string', 'number']
          }
        },
        author:    { type: 'string', pattern: /^[\w ]+$/i, required: true, messages: { required: "is essential for survival" } },
        published: { type: 'boolean', 'default': false },
        category:  { type: 'string' },
        palindrome: {type: 'string', conform: function(val) {
          return val == val.split("").reverse().join(""); }
        },
        coordinates: {
          type: 'array',
          items: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: {
              type: 'Number'
            }
          }
        }
      },
      patternProperties: {
        '^_': {
          type: 'boolean', default: false
        }
      }
    },
    "and an object": {
      topic: {
        title:    'Gimme some Gurus',
        date:     '2012-02-04',
        body:     "And I will pwn your codex.",
        tags:     ['energy drinks', 'code'],
        tuple:    ['string0', 103],
        author:   'cloudhead',
        published: true,
        category: 'misc',
        palindrome: 'dennis sinned',
        coordinates: [[1, 2], [3, 4]],
        _flag: true
      },
      "can be validated with `revalidator.validate`": {
        "and if it conforms": {
          topic: function (object, schema) {
            return revalidator.validate(object, schema);
          },
          "return an object with the `valid` property set to true": assertValid,
          "return an object with the `errors` property as an empty array": function (res) {
            assert.isArray(res.errors);
            assert.isEmpty(res.errors);
          }
        },
        "and if it has a missing required property": {
          topic: function (object, schema) {
            object = clone(object);
            delete object.author;
            return revalidator.validate(object, schema);
          },
          "return an object with `valid` set to false":       assertInvalid,
          "and an error concerning the 'required' attribute": assertHasError('required'),
          "and the error message defined":                    assertHasErrorMsg('required', "is essential for survival")
        },
        "and if it has a missing non-required property": {
          topic: function (object, schema) {
            object = clone(object);
            delete object.category;
            return revalidator.validate(object, schema);
          },
          "return an object with `valid` set to false":       assertValid
        },
        "and if it has a incorrect pattern property": {
          topic: function (object, schema) {
            object = clone(object);
            object._additionalFlag = 'text';
            return revalidator.validate(object, schema);
          },
          "return an object with `valid` set to false":       assertInvalid
        },
        "and if it has a incorrect unique array property": {
          topic: function (object, schema) {
            object = clone(object);
            object.tags = ['a', 'a'];
            return revalidator.validate(object, schema);
          },
          "return an object with `valid` set to false":       assertInvalid
        },
        "and if it has a incorrect array property (wrong values)": {
          topic: function (object, schema) {
            object = clone(object);
            object.tags = ['a', '____'];
            return revalidator.validate(object, schema);
          },
          "return an object with `valid` set to false":       assertInvalid
        },
        "and if it has a incorrect array property (< minItems)": {
          topic: function (object, schema) {
            object = clone(object);
            object.tags = ['x'];
            return revalidator.validate(object, schema);
          },
          "return an object with `valid` set to false":       assertInvalid
        },
        "and if it has a incorrect format (date)": {
          topic: function (object, schema) {
            object = clone(object);
            object.date = 'bad date';
            return revalidator.validate(object, schema);
          },
          "return an object with `valid` set to false":       assertInvalid,
          "and the error message defined":                    assertHasErrorMsg('format', "must be a valid date and nothing else")
        },
        "and if it is not a palindrome (conform function)": {
          topic: function (object, schema) {
            object = clone(object);
            object.palindrome = 'bad palindrome';
            return revalidator.validate(object, schema);
          },
          "return an object with `valid` set to false":       assertInvalid
        },
        "and if it didn't validate a pattern": {
          topic: function (object, schema) {
            object = clone(object);
            object.author = 'email@address.com';
            return revalidator.validate(object, schema);
          },
          "return an object with `valid` set to false":      assertInvalid,
          "and an error concerning the 'pattern' attribute": assertHasError('pattern')
        },
      }
    },
    "with <cast> option": {
      topic: {
        properties: {
          answer: { type: "integer" },
          is_ready: { type: "boolean" },
          date: { type: "date" }
        }
      },
      "and <integer> property": {
        "is castable string": {
          topic: function (schema) {
            return revalidator.validate({ answer: "42" }, schema, { cast: true });
          },
          "return an object with `valid` set to true": assertValid
        },
        "is uncastable string": {
          topic: function (schema) {
            return revalidator.validate({ answer: "forty2" }, schema, { cast: true });
          },
          "return an object with `valid` set to false": assertInvalid
        }
      },
      "and <date> property": {
        "is castable date ISO string": {
          topic: function (schema) {
            var doc = { date: "2017-04-06T07:02:12.856Z" };
            return revalidator.validate(doc, schema, { cast: true });
          },
          "return an object with `valid` set to true": assertValid
        },
        "is uncastable string": {
          topic: function (schema) {
            var doc = { date: "not a valid date" };
            return revalidator.validate(doc, schema, { cast: true });
          },
          "return an object with `valid` set to false": assertInvalid
        }
      },
      "and option <castSource>:true": {
        topic: function () {
          var schema = {
            properties: {
              answer: { type: "integer" },
              answer2: { type: "number" },
              answer3: {type: "array", items: {type: "string"}},
              answer4: {type: "array", items: {type: "integer"}},
              answer5: {
                type: "array",
                items: {
                  type: "array",
                  items: {
                    type: 'number'
                  }
                }
              },
              is_ready1: { type: "boolean" },
              is_ready2: { type: "boolean" },
              is_ready3: { type: "boolean" },
              is_ready4: { type: "boolean" },
              is_ready5: { type: "boolean" },
              is_ready6: { type: "boolean" },
              date1: { type: "date" },
              date2: { type: "date" },
              date3: { type: "date" }
            }
          };
          var source = {
            answer: "42",
            answer2: "42.2",
            answer3: ["yep"],
            answer4: [1, "2", 3, "4"],
            answer5: [[1], ["2"], [3], ["4"]],
            is_ready1: "true",
            is_ready2: "1",
            is_ready3: 1,
            is_ready4: "false",
            is_ready5: "0",
            is_ready6: 0,
            date1: "2017-04-06T00:00:00",
            date2: "Apr 06 2017",
            date3: new Date("Thu Apr 06 2017 00:00:00")
          };
          var options = { cast: true, castSource: true };
          return {
            res: revalidator.validate(source, schema, options),
            source: source
          };
        },
        "return an object with `valid` set to true": function(topic) {
          return assertValid(topic.res);
        },
        "and modified source object": {
          "with integer": function(topic) {
            return assert.strictEqual(topic.source.answer, 42);
          },
          "with float": function(topic) {
            return assert.strictEqual(topic.source.answer2, 42.2);
          },
          "with not affected array of strings": function(topic) {
            return assert.deepEqual(topic.source.answer3, ["yep"]);
          },
          "with casted items at array of integers": function(topic) {
            var actual = topic.source.answer4;
            if (!Array.isArray(actual)) assert.fail(actual, 'Not an array');
            //coz strict version of deepEqual doesn't exists
            var expected = [1, 2, 3, 4];
            topic.source.answer4.forEach(function(num, index) {
              assert.strictEqual(num, expected[index]);
            });
          },
          "with casted items of nested array of integers": function(topic) {
            var actual = topic.source.answer5;
            if (!Array.isArray(actual)) assert.fail(actual, 'Not an array');
            var expected = [[1], [2], [3], [4]];
            topic.source.answer5.forEach(function(ar, index) {
              if (!Array.isArray(ar)) assert.fail(ar, 'Not an array');
              ar.forEach(function(num, idx) {
                assert.strictEqual(num, expected[index][idx]);
              });
            });
          },
          "with boolean true from string 'true'": function(topic) {
            return assert.strictEqual(topic.source.is_ready1, true);
          },
          "with boolean true from string '1'": function(topic) {
            return assert.strictEqual(topic.source.is_ready2, true);
          },
          "with boolean true from number 1": function(topic) {
            return assert.strictEqual(topic.source.is_ready3, true);
          },
          "with boolean false from string 'false'": function(topic) {
            return assert.strictEqual(topic.source.is_ready4, false);
          },
          "with boolean false from string '0'": function(topic) {
            return assert.strictEqual(topic.source.is_ready5, false);
          },
          "with boolean false from number 0": function(topic) {
            return assert.strictEqual(topic.source.is_ready6, false);
          },
          "with valid date from ISO string": function(topic) {
            return assert.deepEqual(topic.source.date1, new Date("2017-04-06T00:00:00"));
          },
          "with valid date from date string": function(topic) {
            return assert.deepEqual(topic.source.date2, new Date("Apr 06 2017"));
          },
          "with valid date from date": function(topic) {
            return assert.deepEqual(topic.source.date3, new Date("Apr 06 2017"));
          }
        }
      },
      "and <boolean> property": {
        "is castable 'true/false' string": {
          topic: function (schema) {
            return revalidator.validate({ is_ready: "true" }, schema, { cast: true });
          },
          "return an object with `valid` set to true": assertValid
        },
        "is castable '1/0' string": {
          topic: function (schema) {
            return revalidator.validate({ is_ready: "1" }, schema, { cast: true });
          },
          "return an object with `valid` set to true": assertValid
        },
        "is castable `1/0` integer": {
          topic: function (schema) {
            return revalidator.validate({ is_ready: 1 }, schema, { cast: true });
          },
          "return an object with `valid` set to true": assertValid
        },
        "is uncastable string": {
          topic: function (schema) {
            return revalidator.validate({ is_ready: "not yet" }, schema, { cast: true });
          },
          "return an object with `valid` set to false": assertInvalid
        },
        "is uncastable number": {
          topic: function (schema) {
            return revalidator.validate({ is_ready: 42 }, schema, { cast: true });
          },
          "return an object with `valid` set to false": assertInvalid
        }
      },
      "default true": {
        topic: function(schema) {
          revalidator.validate.defaults.cast = true;
          return schema;
        },
        "and no direct <cast> option passed to validate": {
          "and castable number": {
            topic: function (schema) {
              return revalidator.validate({ answer: "42" }, schema);
            },
            "return an object with `valid` set to true": assertValid
          }
        },
        "and direct <cast> false passed to validate": {
          "and castable number": {
            topic: function (schema) {
              return revalidator.validate({ answer: "42" }, schema, { cast: false });
            },
            "return an object with `valid` set to false": assertInvalid
          }
        }
      }
    },
    "with <applyDefaultValue> option": {
      topic: {
        properties: {
          town: {
            type: "string"
          },
          country: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" }
            },
            "default": {
              id: 1,
              name: "New Zealand"
            }
          },
          planet: {
            "type": "string",
            "default": "Earth"
          }
        }
      },
      "enabled": {
        "and acting": {
          topic: function (schema) {
            var source = { town: "Auckland" };
            return {
              res: revalidator.validate(source, schema, {applyDefaultValue: true}),
              source: source
            }
          },
          "return an object with `valid` set to true": function(topic) {
            return assertValid(topic.res);
          },
          "and source object with default country and planet": function(topic) {
            assert.strictEqual(topic.source.town, "Auckland");
            assert.deepEqual(topic.source.country, {
              id: 1, name: "New Zealand"
            });
            assert.strictEqual(topic.source.planet, "Earth");
          }
        },
        "but not acting (since values in source object is set)": {
          topic: function (schema) {
            var source = {
              town: "New York",
              country: {
                id: 2,
                name: "USA"
              },
              planet: "Mars"
            };
            return {
              res: revalidator.validate(source, schema, {applyDefaultValue: true}),
              source: source
            }
          },
          "return an object with `valid` set to true": function(topic) {
            return assertValid(topic.res);
          },
          "and not modified source object": function(topic) {
            assert.strictEqual(topic.source.town, "New York");
            assert.deepEqual(topic.source.country, {id: 2, name: "USA"});
            assert.strictEqual(topic.source.planet, "Mars");
          }
        }
      },
      "not enabled": {
          topic: function (schema) {
            var source = { town: "Auckland" };
            return { res: revalidator.validate(source, schema), source: source }
          },
          "return an object with `valid` set to true": function(topic) {
            return assertValid(topic.res);
          },
          "and source object with undefined country and planet": function(topic) {
            assert.strictEqual(topic.source.town, "Auckland");
            assert.strictEqual(topic.source.country, undefined);
            assert.strictEqual(topic.source.planet, undefined);
          }
      }
    },
    "with <applyDefaultValueIfRequired> option": {
      topic: {
        properties: {
          town: {
            type: "string"
          },
          country: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" }
            },
            default: {
              id: 1,
              name: "New Zealand",
            },
            required: true
          },
          planet: {
            type: "string",
            default: "Earth",
            required: true
          }
        }
      },
      "enabled": {
        "and acting": {
          topic: function (schema) {
            var source = { town: "Auckland" };
            return {
              res: revalidator.validate(source, schema, {applyDefaultValueIfRequired: true}),
              source: source
            }
          },
          "return an object with `valid` set to true": function(topic) {
            return assertValid(topic.res);
          },
          "and source object with default country and planet": function(topic) {
            assert.strictEqual(topic.source.town, "Auckland");
            assert.deepEqual(topic.source.country, {
              id: 1, name: "New Zealand"
            });
            assert.strictEqual(topic.source.planet, "Earth");
          }
        },
        "but not acting (since values in source object is set)": {
          topic: function (schema) {
            var source = {
              town: "New York",
              country: {
                id: 2,
                name: "USA"
              },
              planet: "Mars"
            };
            return {
              res: revalidator.validate(source, schema, {applyDefaultValueIfRequired: true}),
              source: source
            }
          },
          "return an object with `valid` set to true": function(topic) {
            return assertValid(topic.res);
          },
          "and not modified source object": function(topic) {
            assert.strictEqual(topic.source.town, "New York");
            assert.deepEqual(topic.source.country, {id: 2, name: "USA"});
            assert.strictEqual(topic.source.planet, "Mars");
          }
        }
      },
      "not enabled": {
          topic: function (schema) {
            var source = { town: "Auckland", country: { id: 1, name: 'New Zealand' }, planet: 'Earth' };
            return { res: revalidator.validate(source, schema), source: source }
          },
          "return an object with `valid` set to true": function(topic) {
            return assertValid(topic.res);
          },
          "and source object with undefined country and planet": function(topic) {
            assert.strictEqual(topic.source.town, "Auckland");
            assert.deepEqual(topic.source.country, { id: 1, name: 'New Zealand' });
            assert.strictEqual(topic.source.planet, 'Earth');
          }
      }
    },
    "with <validateDefaultValue> option": {
      topic: {
        properties: {
          town: {
            type: "string"
          },
          country: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" }
            }
          },
          planet: {
            "type": "string"
          }
        }
      },
      "enabled": {
        "and valid default value": {
          topic: function(schema) {
            schema.properties.country['default'] = { id: 1, name: "New Zealand" };
            return revalidator.validate(
              { town: "Auckland" }, schema, { validateDefaultValue: true }
            );
          },
          "return an object with `valid` set to true": assertValid
        },
        "and invalid default value": {
          topic: function(schema) {
            schema.properties.country['default'] = { id: "abc", name: "New Zealand" };
            return revalidator.validate(
              { town: "Auckland" }, schema, { validateDefaultValue: true }
            );
          },
          "return an object with `valid` set to false": assertInvalid,
          "and an error concerning the attribute": assertHasError('type', 'id')
        }
      },
      "not enabled": {
        "and invalid default value": {
          topic: function(schema) {
            schema.properties.country['default'] = { id: "abc", name: "New Zealand" };
            return revalidator.validate({ town: "Auckland" }, schema);
          },
          "return an object with `valid` set to true": assertValid
        }
      }
    },
    "with break on first error options and source object with 2 errors": {
      topic: {
        schema: {
          properties: {
            town: {
              type: "string"
            },
            country: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" }
              },
              "default": {
                id: 1,
                name: "New Zealand"
              }
            },
            planet: {
              "type": "string",
              "default": "Earth"
            }
          }
        },
        source: {town: 1, planet: 2}
      },
      "when <exitOnFirstError> option enabled": {
        topic: function (topic) {
          return revalidator.validate(topic.source, topic.schema, {exitOnFirstError: true});
        },
        "return an object with `valid` set to false": assertInvalid,
        "1 error at errors": function(topic) {
          assert.strictEqual(topic.errors.length, 1);
        }
      },
      "when <exitOnFirstError> option not enabled": {
          topic: function (topic) {
            return revalidator.validate(topic.source, topic.schema);
          },
          "return an object with `valid` set to false": assertInvalid,
          "2 errors at errors": function(topic) {
            assert.strictEqual(topic.errors.length, 2);
          }
      },
      "when <failOnFirstError> option enabled": {
        topic: function (topic) {
          assert.throws(function() {
            revalidator.validate(topic.source, topic.schema, {failOnFirstError: true});
          }, function(err) {
              assert.strictEqual(err.message, 'Property "town" must be of string type');
              assert.ok(err.info);
              return err instanceof Error;
          });
          return true;
        },
        "should throws an error and return true": function(topic) {
          assert.strictEqual(topic, true);
        }
      }
    },
    "filtering": {
      topic: function() {
        revalidator.validate.filters.trim = function(value) {
          return value.replace(/^\s+|\s+$/g, '');
        };
        revalidator.validate.filters.stripTags = function(value) {
          return value.replace(/<(?:.|\n)*?>/gm, '');
        };
        return {
            properties: {
              town: {
                type: ["string", "null", "array"],
                minLength: 3,
                filter: "trim"
              },
              country: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  name: { type: "string", filter: "stripTags" }
                }
              },
              planet: {
                type: ["string", "integer", "object"],
                filter: ["stripTags", revalidator.validate.filters.trim]
              },
              addresses: {
                type: "array",
                items: {type: "string", filter: "trim"}
              }
            }
        };
      },
      "with valid values": {
        "should be ok": {
          topic: function(schema) {
            var getSource = function() {
              return {
                town: "  Auckland  ",
                country: {
                  id: 1,
                  name: "<b>New Zealand</b>"
                },
                planet: "  <b>Earth</b>  "
              };
            };
            var source = getSource();
            return {
              res: revalidator.validate(source, schema),
              source: source,
              originalSource: getSource()
            };
          },
          "return an object with `valid` set to true": function(topic) {
            assertValid(topic.res);
          },
          "and modified source object": function(topic) {
            assert.strictEqual(
              topic.source.town,
              revalidator.validate.filters.trim(topic.originalSource.town)
            );
            assert.strictEqual(
              topic.source.country.name,
              revalidator.validate.filters.stripTags(topic.originalSource.country.name)
            );
            assert.strictEqual(
              topic.source.planet,
              revalidator.validate.filters.stripTags(
                revalidator.validate.filters.trim(topic.originalSource.planet)
              )
            );
          }
        },
        "but min length prevents filtering of 'town' field": {
          topic: function(schema) {
            var getSource = function() {
              return {
                town: " N",
                country: {
                  id: 1,
                  name: "<b>New Zealand</b>"
                },
                planet: "  <b>Earth</b>  "
              };
            };
            var source = getSource();
            return {
              res: revalidator.validate(source, schema),
              source: source,
              originalSource: getSource()
            }
          },
          "return an object with `valid` set to false": function(topic) {
            assertInvalid(topic.res);
          },
          "and an error with 'minLength' attribute and 'town'": function(topic) {
            assertHasError('minLength', 'town')(topic.res);
          },
          "and not modified 'town'": function(topic) {
            assert.strictEqual(topic.source.town, topic.originalSource.town);
          },
          "and modified 'planet'": function(topic) {
            assert.strictEqual(
              topic.source.planet,
              revalidator.validate.filters.stripTags(
                revalidator.validate.filters.trim(topic.originalSource.planet)
              )
            );
          }
        },
        "and array items should be ok": {
          topic: function(schema) {
            var getSource = function() {
              return {addresses: [' street 1  ', 'street2', '  street3     ']};
            };
            var source = getSource();
            return {
              res: revalidator.validate(source, schema),
              source: source,
              originalSource: getSource()
            };
          },
          "return an object with `valid` set to true": function(topic) {
            assertValid(topic.res);
          },
          "and modified source object": function(topic) {
            assert.deepEqual(
              topic.source.addresses,
              topic.source.addresses.map(revalidator.validate.filters.trim)
            );
          }
        }
      },
      "with invalid values": {
        "(values break filter function)": {
          topic: function(schema) {
            return revalidator.validate({
                town: null,
                country: {
                  id: 1,
                  name: "<b>New Zealand</b>"
                },
                planet: 1
              }, schema);
          },
          "return an object with `valid` set to false": function(topic) {
            assertInvalid(topic);
          },
          "and an error with 'filter' attribute and 'town'": assertHasError('filter', 'town'),
          "and an error with 'filter' attribute and 'planet'": assertHasError('filter', 'planet')
        },
        "(values of unfilterable types)": {
          topic: function(schema) {
            return revalidator.validate({
                town: [1, 2],
                country: {
                  id: 1,
                  name: "<b>New Zealand</b>"
                },
                planet: {name: "Earth"}
              }, schema);
          },
          "return an object with `valid` set to false": function(topic) {
            assertInvalid(topic);
          },
          "and an error with 'filter' attribute and bad type messages": function(res) {
            assert.strictEqual(res.errors[0].attribute, 'filter');
            assert.strictEqual(res.errors[0].property, 'town');
            assert.strictEqual(res.errors[0].message, 'bad property type for filtering: array');
            assert.strictEqual(res.errors[1].attribute, 'filter');
            assert.strictEqual(res.errors[1].property, 'planet');
            assert.strictEqual(res.errors[1].message, 'bad property type for filtering: object');
          }
        }
      }
    }
  }
}).export(module);
