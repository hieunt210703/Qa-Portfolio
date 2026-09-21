// Generated from the repository QA artifacts. Do not edit by hand.
export const portfolioData = {
  "testCases": [
    {
      "id": "TC-S-001",
      "title": "Home page loads",
      "type": "Smoke",
      "priority": "High",
      "preconditions": "Demo site up",
      "steps": [
        "1. Navigate to home page",
        "2. Observe page"
      ],
      "expected": "Home page content loads, key navigation present"
    },
    {
      "id": "TC-S-002",
      "title": "Text Box: submit form",
      "type": "Smoke",
      "priority": "High",
      "preconditions": "Text Box page open",
      "steps": [
        "1. Fill required fields",
        "2. Click Submit"
      ],
      "expected": "Form submission shows entered data confirmation"
    },
    {
      "id": "TC-F-001",
      "title": "Text Box: validate required email",
      "type": "Functional",
      "priority": "High",
      "preconditions": "Text Box page open",
      "steps": [
        "1. Enter invalid email",
        "2. Submit"
      ],
      "expected": "Validation message shown; submission blocked"
    },
    {
      "id": "TC-F-002",
      "title": "File Upload: accept valid file",
      "type": "Functional",
      "priority": "Medium",
      "preconditions": "Upload page open",
      "steps": [
        "1. Choose supported file",
        "2. Upload"
      ],
      "expected": "File uploads successfully and confirmation shown"
    },
    {
      "id": "TC-R-001",
      "title": "Links: no broken links on main sections",
      "type": "Regression",
      "priority": "High",
      "preconditions": "Home page open",
      "steps": [
        "1. Click primary links",
        "2. Verify pages load"
      ],
      "expected": "No broken links; pages reachable"
    }
  ],
  "executions": [
    {
      "id": "TC-S-001",
      "title": "Home page loads",
      "executedBy": "CyberDataCataProjects",
      "date": "2026-01-19",
      "result": "Pass",
      "notes": ""
    },
    {
      "id": "TC-S-002",
      "title": "Text Box: submit form",
      "executedBy": "CyberDataCataProjects",
      "date": "2026-01-19",
      "result": "Pass",
      "notes": "Used sample data row 1"
    },
    {
      "id": "TC-F-001",
      "title": "Text Box: validate required email",
      "executedBy": "CyberDataCataProjects",
      "date": "2026-01-19",
      "result": "Fail",
      "notes": "Validation not shown for invalid email"
    }
  ],
  "testData": [
    {
      "name": "Alice Example",
      "email": "alice@example.com",
      "current_address": "123 Main St",
      "permanent_address": "456 Other St"
    },
    {
      "name": "Bob Tester",
      "email": "bob.tester+qa@example.com",
      "current_address": "789 North Rd",
      "permanent_address": "101 South Ave"
    }
  ],
  "planSections": [
    {
      "title": "Purpose and Objectives",
      "items": [
        "Demonstrate structured manual testing: planning, designing test cases, executing, reporting bugs, and tracking test data.",
        "Provide artifacts suitable for interviews and initial team contributions."
      ]
    },
    {
      "title": "Scope",
      "items": [
        "In-scope: Core interactive UI elements (forms, buttons, links), basic workflows (form submission, file upload/download), input validation, navigation and accessibility checks.",
        "Out-of-scope: Performance, security, and extensive cross-browser matrix (can be added later)."
      ]
    },
    {
      "title": "Test Approach",
      "items": [
        "Manual test cases organized by type: Smoke, Functional, Regression.",
        "Exploratory testing during test execution to discover edge cases.",
        "Use sample test data in test_data.csv."
      ]
    },
    {
      "title": "Test Items",
      "items": [
        "Text Box (Forms)",
        "Buttons",
        "Links (including broken links)",
        "File upload/download",
        "Checkboxes and radio buttons"
      ]
    },
    {
      "title": "Test Types",
      "items": [
        "Smoke: basic sanity checks to ensure major flows work.",
        "Functional: feature-level tests for expected behavior.",
        "Regression: re-run critical tests after fixes."
      ]
    },
    {
      "title": "Entry Criteria",
      "items": [
        "Demo site accessible and stable.",
        "Test cases reviewed."
      ]
    },
    {
      "title": "Exit Criteria",
      "items": [
        "All smoke tests pass.",
        "No P0/P1 open defects.",
        "Test execution records updated."
      ]
    },
    {
      "title": "Risks and Mitigations",
      "items": [
        "Demo site instability: schedule testing during low-traffic windows and document intermittent failures.",
        "Incomplete requirements: adopt exploratory testing and document assumptions."
      ]
    },
    {
      "title": "Reporting",
      "items": [
        "Use BUG_REPORT_TEMPLATE.md for issues.",
        "Store execution results in SAMPLE_TEST_EXECUTION_REPORT.csv."
      ]
    },
    {
      "title": "How I'd extend this",
      "items": [
        "Add automation (suggested stack: JavaScript + Playwright) for smoke/regression tests.",
        "Add GitHub Actions CI to run automation on push and PRs.",
        "Add HTML/JUnit reporting and Docker-based test runner for reproducible runs."
      ]
    }
  ],
  "bug": {
    "title": "Form submit accepts invalid email",
    "environment": "Windows 10, Chrome 117, https://demoqa.com/text-box",
    "severity": "P1",
    "steps": [
      "Open Text Box page",
      "Enter 'not-an-email' in Email field",
      "Click Submit"
    ],
    "actual": "Form submits and confirmation shows invalid email",
    "expected": "Validation error shown and form not submitted"
  }
} as const;
