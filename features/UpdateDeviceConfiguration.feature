Feature: Update Device Configuration

  As a user
  I can update the device configuration

  Background:

    Given I am run after the "Login" feature
    And I am run after the "Connect a Cat Tracker" feature
    And the endpoint is "{apiEndpoint}"
    And the Authorization header is "Bearer {accessToken}"
    And the Content-Type header is "application/json; charset=utf-8"

  Scenario: Update the device configuration as a user

    When I PATCH /device/{deviceId} with this JSON
      """
      {
        "config": {
          "act": false,
          "actwt": 60,
          "mvres": 60,
          "mvt": 3600,
          "gpst": 1000,
          "celt": 600,
          "acct": 5
        }
      }
      """
    Then the response status code should be 202
