Feature: List cats

    As a user
    I can list the cats

    Background:

        Given I am run after the "Login" feature
        And I am run after the "Connect a Cat Tracker" feature
        And the endpoint is "{apiEndpoint}"
        And the Authorization header is "Bearer {accessToken}"
        And the Content-Type header is "application/json; charset=utf-8"

    Scenario: The user should be able to list cats

        When I GET /devices
        Then the response status code should be 200
        And "$[deviceId='{catId}'].deviceId" of the response body should equal "{catId}"
