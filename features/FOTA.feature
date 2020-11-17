Feature: Device Firmware Upgrade over the air
  As a user
  I can upgrade the firmware of my devices
  over the air

  Background:

    Given I am run after the "Login" feature
    And I am run after the "Connect a Cat Tracker" feature
    And the endpoint is "{apiEndpoint}"
    And the Authorization header is "Bearer {accessToken}"

  Scenario: Create a new firmware upgrade as a user (uploads are base64 encoded)

    Given the Content-Type header is "text/plain; charset=UTF-8"
    And I encode this payload into "firmwareImageUpload" using base64
      """
      1.0.1 FIRMWARE HEX FILE
      """
    When I POST to /firmware with this payload
      """
      {firmwareImageUpload}
      """
    Then the response status code should be 200
    And "success" of the response body should be true
    And "$length(url) > 60" of the response body should be true
    And I store "url" of the response body as "fwPackageURI"

  Scenario: Configure the firmware job on the device

    Given the Content-Type header is "application/json; charset=utf-8"
    When I PATCH /device/{catId} with this JSON
      """
      {
        "firmware": {
          "fwVersion": "1.0.1",
          "fwPackageURI": "{fwPackageURI}"
        }
      }
      """
    Then the response status code should be 202

  # Rule: fwLocationPath has no leading slash

  Scenario: Fetch the job as a device and mark as in progress

    Given I store "$match(fwPackageURI,/^https?:\/\/([^\/]+)/).groups[0]" into "fwLocationHost"
    And I store "$substring($match(fwPackageURI,/^https?:\/\/[^\/]+(\/.+)/).groups[0], 1)" into "fwLocationPath"
    When the desired state of the cat tracker "{catId}" matches
      """
      {
        "firmware": {
          "fwVersion": "1.0.1",
          "fwPackageURI": "{fwPackageURI}",
          "fwLocation": {
            "host": "{fwLocationHost}",
            "path": "{fwLocationPath}"
          },
				  "fwFragmentSize": 1800
        }
      }
      """
    Then the cat tracker "{catId}" updates its reported state with
      """
      {
        "firmware": {
          "currentFwVersion": "1.0.0",
          "pendingFwVersion": "1.0.1",
          "status": "downloading"
        }
      }
      """

  Scenario: Read the job execution status

    When I GET /device/{catId}
    Then the response status code should be 200
    Then "properties.desired" of the response body should match this JSON
      """
      {
        "firmware": {
          "fwVersion": "1.0.1",
          "fwPackageURI": "{fwPackageURI}",
          "fwLocation": {
            "host": "{fwLocationHost}",
            "path": "{fwLocationPath}"
          },
          "fwFragmentSize": 1800
        }
      }
      """
    And "properties.reported" of the response body should match this JSON
      """
      {
        "firmware": {
          "currentFwVersion": "1.0.0",
          "pendingFwVersion": "1.0.1",
          "status": "downloading"
        }
      }
      """

  Scenario: Download firmware

    When I download the firmware from {fwPackageURI}
    Then the firmware file should contain this payload
      """
      1.0.1 FIRMWARE HEX FILE
      """

  Scenario: Download firmware using HTTP (the nRF9160 implementation does this)

    When I download the firmware from http://{fwLocationHost}/{fwLocationPath}
    Then the firmware file should contain this payload
      """
      1.0.1 FIRMWARE HEX FILE
      """