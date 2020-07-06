Feature: List Devices

    As a user
    I can list devices

    Background:

        Given I am run after the "Login" feature
        And the endpoint is "{apiEndpoint}"
        And the Authorization header is "Bearer {accessToken}"
        And the Content-Type header is "application/json; charset=utf-8"

    Scenario: List devices

        When I GET /devices
        Then the response status code should be 200