// testing if Protractor can be used for ZeroNet / AngularJS. looks OK.
// should add some helper functions:
// - insert Name = jro test protractor in Account
// - should only display browser console.log for failed test
// - should display formatted console.log files
// - should display all console.log files. chrome or protractor is compressing info
// - could be nice with element(by.model(...)) syntax is not supported https://github.com/angular/protractor
// - add click_confirm_box helper
// - either create and delete test account for each test run or use a test user in protractor tests
// - how to test 2 or more user interactions?

// spec.js
describe('Protractor Demo App', function() {

  var originalTimeout ;

  beforeAll(function () {
    browser.ignoreSynchronization = true;
    browser.get('http://127.0.0.1:43110/moneynetwork.bit');
  });

  afterAll(function () {
    browser.ignoreSynchronization = false;
  });

  beforeEach(function() {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    console.log('originalTimeout = ' + originalTimeout) ;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  });


  afterEach(function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    browser.manage().logs().get('browser').then(function(browserLog) {
      console.log('log: ' + require('util').inspect(browserLog));
    });
  }) ;


  it('should have a title', function() {
    expect(browser.getTitle()).toEqual('MoneyNetwork - ZeroNet');
  });

  it('certificate should be deselected', function() {

  }) ;

  // todo: ZeroNet certificate is already selected in google chrome! test should start with no certificate

  it('create and delete guest account', function() {
    var use_login_checkbox, log_in_button, delete_user2_link, confirm_button ;
    browser.switchTo().frame(0);
    browser.sleep(1000); // wait for MoneyNetwork to load
    use_login_checkbox = $('#test_use_login_checkbox') ;
    expect(use_login_checkbox.isPresent()).toBe(true);
    use_login_checkbox.click() ;
    expect(use_login_checkbox.isSelected()).toBe(false);
    log_in_button = $('#test_log_in_1') ;
    expect(log_in_button.isPresent()).toBe(true);
    log_in_button.click() ;
    browser.sleep(1000); // wait for log in process
    expect(browser.getCurrentUrl()).toEqual('http://127.0.0.1:43110/moneynetwork.bit/?path=/user');
    delete_user2_link = $('#test_delete_user2');
    expect(delete_user2_link.isPresent()).toBe(true);
    delete_user2_link.click() ;
    browser.sleep(1000); // wait for confirm dialog box
    // click confirm delete user buttom
    browser.switchTo().defaultContent();
    confirm_button = $('.button.button-confirm.button-Delete.button-1') ;
    expect(confirm_button.isPresent()).toBe(true);
    var EC = protractor.ExpectedConditions;
    browser.wait(EC.visibilityOf(confirm_button), 5000);
    confirm_button.click() ;
    browser.sleep(45000); // wait for delete account operation + publish
    expect(browser.getCurrentUrl()).toEqual('http://127.0.0.1:43110/moneynetwork.bit/?path=/auth');
  }) ;

});
