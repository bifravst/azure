Feature: Connect a Cat Tracker
  As a user
  I can connect a cat tracker

  Scenario: Generate a certificate and connect

    Given I have a random uuid in "deviceId"
    When I generate a certificate for the device "{deviceId}"
    Then I connect the device "{deviceId}"
