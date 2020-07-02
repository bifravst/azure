Feature: Login

    As a user
    I can log in

    Note: this tests only that login is possible, once this works, sign-up,
    password reset etc. can be assumed to be working because this is handled
    by Azure ActiveDirectory B2C.

    Scenario: Log in

        Given I have a random email in "userEmail"
        And I have a random password in "userPassword"
        And an Azure AD B2C user exists with the email "{userEmail}" and the password "{userPassword}"
