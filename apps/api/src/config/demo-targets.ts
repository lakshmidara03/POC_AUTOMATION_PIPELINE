export interface DemoTarget {
  id: string;
  label: string;
  instructionTemplate: string;
}

export const DEMO_TARGETS: DemoTarget[] = [
  {
    id: 'the-internet',
    label: 'The Internet — Simple Login',
    instructionTemplate: `Login to https://the-internet.herokuapp.com/login
Username: tomsmith
Password: SuperSecretPassword!
Verify secure area dashboard is displayed.`,
  },
  {
    id: 'practice-test-automation',
    label: 'Practice Test Automation — Student Login',
    instructionTemplate: `Login to https://practicetestautomation.com/practice-test-login/
Username: student
Password: Password123
Verify page redirects to successfully logged in page.`,
  },
  {
    id: 'saucedemo',
    label: 'SauceDemo — Swag Labs Catalog Store',
    instructionTemplate: `Login to https://www.saucedemo.com/
Username: standard_user
Password: secret_sauce
Verify Swag Labs inventory catalog header title is displayed.`,
  },
];
