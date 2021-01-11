Feature: Read Device Shadow
  As a user
  I can read the device shadow

  Background:

    Given I am run after the "Update Device Configuration" feature
    And I am run after the "Device: Update Shadow" feature
    And the endpoint is "{apiEndpoint}"
    And the Authorization header is "Bearer {accessToken}"
    And the Content-Type header is "application/json; charset=utf-8"

  Scenario: Read reported and desired state as user

    When I GET /device/{catId}
    Then the response status code should be 200
    Then "properties.desired" of the response body should match this JSON
      """
      {
        "cfg": {
          "act": false,
          "actwt": 60,
          "mvres": 60,
          "mvt": 3600,
          "gpst": 1000,
          "celt": 600,
          "acct": 0.5
        }
      }
      """
    And "properties.reported" of the response body should match this JSON
      """
      {
        "dev": {
          "v": {
            "band": 3,
            "nw": "NB-IoT GPS",
            "iccid": "89882806660004909182",
            "modV": "mfw_nrf9160_1.0.0",
            "brdV": "thingy91_nrf9160"
          },
          "ts": 1567921067432
        },
        "bat": {
          "v": 3781,
          "ts": 1567942204010
        },
        "cfg": {
          "act": false,
          "actwt": 60,
          "mvres": 60,
          "mvt": 3600,
          "gpst": 1000,
          "celt": 600,
          "acct": 0.5
        },
        "firmware": {
          "status": "current",
          "currentFwVersion": "0.14.6",
          "pendingFwVersion": ""
        }
      }
      """