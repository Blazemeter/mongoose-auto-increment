var async = require('async'),
should = require('should'),
mongoose = require('mongoose'),
autoIncrement = require('..'),
connection;

before(async function () {
  // Use async/await to handle asynchronous operations
  connection = await mongoose.createConnection('mongodb://127.0.0.1/mongoose-auto-increment-test');
  connection.on('error', console.error.bind(console));
  autoIncrement.initialize(connection);
});

after(async function () {
  // Use async/await to handle asynchronous operations
  await connection.db.dropDatabase();
  await connection.close();
});

afterEach(async function () {
  // Use async/await to handle asynchronous operations
  await connection.model('User').collection.drop();
  delete connection.models.User;
  await connection.model('IdentityCounter').collection.drop();
});

describe('mongoose-auto-increment', function () {

  it('should increment the _id field on save', async function () {

    // Arrange
    var userSchema = new mongoose.Schema({
      name: String,
      dept: String
    });
    userSchema.plugin(autoIncrement.plugin, 'User');
    var User = connection.model('User', userSchema),
    user1 = new User({ name: 'Charlie', dept: 'Support' }),
    user2 = new User({ name: 'Charlene', dept: 'Marketing' });
    // Act
    try {
    const [result1, result2] = await Promise.all([
     user1.save(),
     user2.save()
    ]);

    const results = Object.fromEntries([
      ['user1', result1],
      ['user2', result2]
    ]);
    // Assert
    should.exists(results.user1);
    should.exists(results.user2);
    should(results.user1).have.property('_id', 0);
    should(results.user2).have.property('_id', 1);
    } catch (err) {
        should.not.exist(err);
    }
  });

  it('should increment the specified field instead (Test 2)', async function() {

    // Arrange
    var userSchema = new mongoose.Schema({
      name: String,
      dept: String
    });
    userSchema.plugin(autoIncrement.plugin, { model: 'User', field: 'userId' });
    var User = connection.model('User', userSchema),
    user1 = new User({ name: 'Charlie', dept: 'Support' }),
    user2 = new User({ name: 'Charlene', dept: 'Marketing' });

    try {
        const [result1, result2] = await Promise.all([
         user1.save(),
         user2.save()
        ]);

        const results = Object.fromEntries([
          ['user1', result1],
          ['user2', result2]
        ]);
        // Assert
        should.exists(results.user1);
        should.exists(results.user2);
        should(results.user1).have.property('userId', 0);
        should(results.user2).have.property('userId', 1);
    } catch (err) {
            should.not.exist(err);
    }
  });


  it('should start counting at specified number (Test 3)', async function () {

    // Arrange
    var userSchema = new mongoose.Schema({
      name: String,
      dept: String
    });
    userSchema.plugin(autoIncrement.plugin, { model: 'User', startAt: 3 });
    var User = connection.model('User', userSchema),
    user1 = new User({ name: 'Charlie', dept: 'Support' }),
    user2 = new User({ name: 'Charlene', dept: 'Marketing' });

    try {
        const [result1, result2] = await Promise.all([
         user1.save(),
         user2.save()
        ]);

        const results = Object.fromEntries([
          ['user1', result1],
          ['user2', result2]
        ]);
        // Assert
        should.exists(results.user1);
        should.exists(results.user2);
        should(results.user1).have.property('_id', 3);
        should(results.user2).have.property('_id', 4);
    } catch (err) {
        should.not.exist(err);
    }

  });

  it('should increment by the specified amount (Test 4)', async function () {

    // Arrange
    var userSchema = new mongoose.Schema({
      name: String,
      dept: String
    });

    userSchema.plugin(autoIncrement.plugin, { model: 'User', incrementBy: 5 });
    var User = connection.model('User', userSchema),
    user1 = new User({ name: 'Charlie', dept: 'Support' }),
    user2 = new User({ name: 'Charlene', dept: 'Marketing' });

    try {
        const [result1, result2] = await Promise.all([
         user1.save(),
         user2.save()
        ]);

        const results = Object.fromEntries([
          ['user1', result1],
          ['user2', result2]
        ]);
        // Assert
        should.exists(results.user1);
        should.exists(results.user2);
        should(results.user1).have.property('_id', 0);
        should(results.user2).have.property('_id', 5);
    } catch (err) {
        should.not.exist(err);
    }

  });


  describe('helper function', function () {

    it('nextCount should return the next count for the model and field (Test 5)', async function () {

      // Arrange
      var userSchema = new mongoose.Schema({
        name: String,
        dept: String
      });
      userSchema.plugin(autoIncrement.plugin, 'User');
      var User = connection.model('User', userSchema),
      user1 = new User({ name: 'Charlie', dept: 'Support' }),
      user2 = new User({ name: 'Charlene', dept: 'Marketing' });;

     // Act
    result1 = await new Promise((resolve, reject) => {
    user1.nextCount((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
    });
    const result2 = await user1.save();
    result3 = await new Promise((resolve, reject) => {
    user1.nextCount((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
    });
    const result4 = await user2.save();
    result5 = await new Promise((resolve, reject) => {
    user2.nextCount((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
    });
    should(result2).have.property('_id', 0);
    should(result4).have.property('_id', 1);
    should(result1).equal(0);
    should(result3).equal(1);
    should(result5).equal(2);
    });

    it('resetCount should cause the count to reset as if there were no documents yet.', async function () {

      // Arrange
      var userSchema = new mongoose.Schema({
        name: String,
        dept: String
      });
      userSchema.plugin(autoIncrement.plugin, 'User');
      var User = connection.model('User', userSchema),
      user = new User({name: 'Charlie', dept: 'Support'});

      // Act
      var result2, result3, result4;
     const result1 = await user.save();
     result2 = await new Promise((resolve, reject) => {
     user.nextCount((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
    });
    result3 = await new Promise((resolve, reject) => {
    user.resetCount((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
    });
    result4 = await new Promise((resolve, reject) => {
    user.nextCount((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
    });
    should.exist(result1);
    should(result1).have.property('_id', 0);
    should(result2).equal(1);
    should(result3).equal(0);
    should(result4).equal(0);
    });

  });
});

