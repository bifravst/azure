Feature: Device: Messages

  Devices can publish arbitrary messages on a special topic

  Background:

    Given I am run after the "Device: Update Shadow" feature
    And I am run after the "Login" feature

  Scenario: Devices publishes that a button was pressed

    Given I store "$millis()" into "ts"
    Then the cat tracker "{catId}" publishes this message to the topic devices/{catId}/messages/events/
      """
      {
      "btn": {
      "v": 1,
      "ts": {ts}
      }
      }
      """
    Given I store "$millis()" into "ts"
    Then the cat tracker "{catId}" publishes this message to the topic devices/{catId}/messages/events/
      """
      {
      "btn": {
      "v": 0,
      "ts": {ts}
      }
      }
      """

  Scenario: Query the message data

    Given the endpoint is "{apiEndpoint}"
    And the Authorization header is "Bearer {accessToken}"
    And the Content-Type header is "application/json; charset=utf-8"
    When I POST to /history with this JSON
      """
      {
        "query": "SELECT c.deviceUpdate.btn.v AS v FROM c WHERE c.deviceId = \"{catId}\" AND c.deviceUpdate.btn.v != null ORDER BY c.timestamp DESC"
      }
      """
    Then the response status code should be 200
    And "result" of the response body should match this JSON
      """
      [
        {
          "v": 1
        },
        {
          "v": 0
        }
      ]
      """