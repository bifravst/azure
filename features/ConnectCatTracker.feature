Feature: Connect a Cat Tracker
  As a user
  I can connect a cat tracker

  Scenario: Generate a certificate and connect

    Given I have a random uuid in "catId"
    When I generate a certificate for the device "{catId}"
    Then I connect the device "{catId}"
