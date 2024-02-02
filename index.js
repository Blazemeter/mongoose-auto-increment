// Module Scope
var mongoose = require('mongoose'),
extend = require('extend'),
counterSchema,
IdentityCounter;

// Initialize plugin by creating counter collection in database.
exports.initialize = function (connection) {
  try {
    IdentityCounter = connection.model('IdentityCounter');
  } catch (ex) {
    if (ex.name === 'MissingSchemaError') {
      // Create new counter schema.
      counterSchema = new mongoose.Schema({
        model: { type: String, require: true },
        field: { type: String, require: true },
        count: { type: Number, default: 0 }
      });

      // Create a unique index using the "field" and "model" fields.
        counterSchema.index({ field: 1, model: 1 }, {
            unique: true,
            required: true,
            index: -1,
            sparse: true,
        });

      // Create model using new schema.
      IdentityCounter = connection.model('IdentityCounter', counterSchema);
    }
    else
      throw ex;
  }
};

// The function to use when invoking the plugin on a custom schema.
exports.plugin = async function (schema, options) {

  if (!counterSchema || !IdentityCounter) throw new Error("mongoose-auto-increment has not been initialized");

  var settings = {
    model: null,
    field: '_id',
    startAt: 0,
    incrementBy: 1,
    unique: true,
  },
  fields = {},
  ready = false;

  switch (typeof(options)) {
    case 'string':
      settings.model = options;
    break;
    case 'object':
      extend(settings, options);
    break;
  }

  if (settings.model == null)
    throw new Error("model must be set");

  fields[settings.field] = {
    type: Number,
    require: true,
    sparse: true,
  };
  if (settings.field !== '_id')
    fields[settings.field].unique = settings.unique
  schema.add(fields);

  const counter = await IdentityCounter.findOne({ model: settings.model, field: settings.field });

  if (!counter) {
    counter = new IdentityCounter({ model: settings.model, field: settings.field, count: settings.startAt - settings.incrementBy });
    await counter.save();
    ready = true;
  }
  else {
    ready = true;
  }

  var nextCount = function () {
    return new Promise((resolve, reject) => {
      IdentityCounter.findOne({
        model: settings.model,
        field: settings.field
      }, function (err, counter) {
        if (err) return reject(err);
        resolve(counter === null ? settings.startAt : counter.count + settings.incrementBy);
      });
    });
  };
  schema.method('nextCount', nextCount);
  schema.static('nextCount', nextCount);

  var resetCount = function () {
    return new Promise((resolve, reject) => {
      IdentityCounter.findOneAndUpdate(
        { model: settings.model, field: settings.field },
        { count: settings.startAt - settings.incrementBy },
        { new: true },
        function (err) {
          if (err) return reject(err);
          resolve(settings.startAt);
        }
      );
    });
  };
  schema.method('resetCount', resetCount);
  schema.static('resetCount', resetCount);

  schema.pre('save', async function (next) {
    var doc = this;

    if (doc.isNew) {
      (async function save() {
        if (ready) {
          if (typeof doc[settings.field] === 'number') {
            await IdentityCounter.findOneAndUpdate(
              { model: settings.model, field: settings.field, count: { $lt: doc[settings.field] } },
              { count: doc[settings.field] }
            );
            next();
          } else {
            const updatedIdentityCounter = await IdentityCounter.findOneAndUpdate(
              { model: settings.model, field: settings.field },
              { $inc: { count: settings.incrementBy } },
              { new: true }
            );
            doc[settings.field] = updatedIdentityCounter.count;
            next();
          }
        }
        else
          setTimeout(save, 5);
      })();
    }
    else
      next();
  });
};
