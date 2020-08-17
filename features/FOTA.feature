Feature: Device Firmware Upgrade over the air
  As a user
  I can upgrade the firmware of my devices
  over the air

  Background:

    Given I am run after the "Login" feature
    And I am run after the "Connect a Cat Tracker" feature
    And the endpoint is "{apiEndpoint}"
    And the Authorization header is "Bearer {accessToken}"

  Scenario: Create a new firmware upgrade as a user

    Given the Content-Type header is "text/plain; charset=UTF-8"
    When I POST to /firmware with this payload
      """
      SOME HEX DATA
      """
    Then the response status code should be 200
    And "success" of the response should be true
    And "$length(url) > 60" of the response should be "true"
    And I store "url" of the response as "fwLocation"

  Scenario: Configure the firmware job on the device

    Given the Content-Type header is "application/json; charset=utf-8"
    And I have a random uuid in "updateJobId"
    When I PATCH /device/{catId} with this JSON
      """
      {
        "fota": {
          "jobId": "{updateJobId}",
          "location": "{fwLocation}"
        }
      }
      """
    Then the response status code should be 202

  Scenario: Fetch the job as a device and mark as in progress

    Given the cat tracker "{catId}" updates its reported state with
    When the cat tracker fetches the next job into "job"
    Then "job" should match this JSON
      """
      {
        "fota": {
          "jobId": "{updateJobId}",
          "status": "IN_PROGRESS"
        }
      }
      """
    And the cat tracker marks the job in "job" as in progress


  Scenario: Read the job execution status

    When I GET /device/{catId}
    Then the response status code should be 200
    Then "properties.desired" of the response body should match this JSON
      """
      {
        "fota": {
          "jobId": "{updateJobId}",
          "location": "{fwLocation}"
        }
      }
      """
    And "properties.reported" of the response body should match this JSON
      """
      {
        "fota": {
          "jobId": "{updateJobId}",
          "status": "IN_PROGRESS"
        }
      }
      """