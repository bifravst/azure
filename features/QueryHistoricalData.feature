Feature: Query Data
  As a user
  I can query the historical data of a device

  Background:

    Given I am run after the "Read Device Shadow" feature
    And I am run after the "Login" feature
    And the endpoint is "{apiEndpoint}"
    And the Authorization header is "Bearer {accessToken}"
    And the Content-Type header is "application/json; charset=utf-8"

  Scenario: Query historical data

    When I POST to /history with this JSON
      """
      {
        "query": "SELECT c.deviceUpdate.properties.reported.bat.v AS v, c.deviceUpdate.properties.reported.bat.ts AS ts FROM c WHERE c.deviceId = \"{catId}\" AND c.deviceUpdate.properties.reported.bat != null ORDER BY c.timestamp DESC OFFSET 0 LIMIT 100"
      }
      """
    Then the response status code should be 200
    And "result" of the response body should match this JSON
      """
      [
        {
          "v": 3781
        }
      ]
      """
