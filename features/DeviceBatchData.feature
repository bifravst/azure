Feature: Device: Batch Data
  Devices can publish batch data

  See https://github.com/bifravst/bifravst/blob/saga/docs/firmware/Protocol.md#3-past-state

  Background:

    Given I am run after the "Device: Update Shadow" feature
    And I am run after the "Login" feature

  Scenario: Devices can publish batch data

    Given the cat tracker "{catId}" publishes this message to the topic devices/{catId}/messages/events/batch
      """
      {
        "gps": [
          {
            "v": {
              "lng": 8.669555,
              "lat": 50.109177,
              "acc": 28.032738,
              "alt": 204.623276,
              "spd": 0.698944,
              "hdg": 0
            },
            "ts": 1567094051000
          },
          {
            "v": {
              "lng": 10.424793,
              "lat": 63.422975,
              "acc": 12.276645,
              "alt": 137.319351,
              "spd": 6.308265,
              "hdg": 77.472923
            },
            "ts": 1567165503000
          }
        ]
      }
      """

  Scenario: Query the historical gps data

    Given the endpoint is "{apiEndpoint}"
    And the Authorization header is "Bearer {accessToken}"
    And the Content-Type header is "application/json; charset=utf-8"
    When I POST to /history with this JSON
      """
      {
        "query": "SELECT c.deviceUpdate.gps.v.lng AS lng FROM c WHERE c.deviceId = \"{catId}\" AND c.deviceUpdate.gps.v != null ORDER BY c.timestamp DESC"
      }
      """
    Then the response status code should be 200
    And "result" of the response body should match this JSON
      """
      [
        {
          "lng": 8.669555
        },
        {
          "lng": 10.424793
        }
      ]
      """
