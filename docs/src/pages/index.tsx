import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import clsx from "clsx";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          Endatix Hub Documentation
        </Heading>
        <p className="hero__subtitle">
          Complete documentation for building and managing form platforms with Endatix
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg margin-right--md"
            to="/docs/developers"
          >
            For Developers
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/end-users"
          >
            For End Users
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomepageContent() {
  return (
    <div className="container margin-top--xl margin-bottom--xl">
      <div className="row">
        <div className="col col--10 col--offset-1">
          <div className="margin-bottom--lg">
            <Heading as="h2">Launch your own form management platform in minutes!</Heading>
            <p>
              Endatix Hub is built on top of SurveyJS - the most customizable form builder library. 
              Whether you're a developer integrating forms into your application or an end user building 
              and managing forms, we have the documentation you need.
            </p>
          </div>

          <div className="margin-bottom--lg">
            <Heading as="h2">Choose Your Path</Heading>
            <div className="row">
              <div className="col col--6">
                <div className="card margin-bottom--md">
                  <div className="card__header">
                    <Heading as="h3">For Developers</Heading>
                  </div>
                  <div className="card__body">
                    <p>
                      Integrate Endatix Hub into your web applications, customize the platform, 
                      and build custom question types. Perfect for developers who want to:
                    </p>
                    <ul>
                      <li>Integrate forms into existing applications</li>
                      <li>Create custom question types and widgets</li>
                      <li>Set up webhooks and automation</li>
                      <li>Deploy and manage the platform</li>
                    </ul>
                    <Link
                      className="button button--primary"
                      to="/docs/developers"
                    >
                      Developer Documentation →
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col col--6">
                <div className="card margin-bottom--md">
                  <div className="card__header">
                    <Heading as="h3">For End Users</Heading>
                  </div>
                  <div className="card__body">
                    <p>
                      Learn how to build forms, manage submissions, and customize your platform 
                      without writing code. Ideal for business users who need to:
                    </p>
                    <ul>
                      <li>Create and design forms</li>
                      <li>Manage form submissions</li>
                      <li>Configure integrations</li>
                      <li>Customize the platform appearance</li>
                    </ul>
                    <Link
                      className="button button--primary"
                      to="/docs/end-users"
                    >
                      End User Guide →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="margin-bottom--lg">
            <Heading as="h2">Key Features</Heading>
            <div className="row">
              <div className="col col--4">
                <Heading as="h3">Advanced Form Builder</Heading>
                <p>
                  Built on SurveyJS with 20+ question types, conditional logic, 
                  multi-language support, and mobile-ready forms.
                </p>
              </div>
              <div className="col col--4">
                <Heading as="h3">Custom Question Types</Heading>
                <p>
                  Build reusable custom question types with drag-and-drop editor. 
                  Tailor logic, UI, and behavior without code.
                </p>
              </div>
              <div className="col col--4">
                <Heading as="h3">Form Management</Heading>
                <p>
                  Centralized backend for managing forms, templates, submissions, 
                  and custom status types for actionable workflows.
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col col--4">
                <Heading as="h3">White-labeling</Heading>
                <p>
                  Full control over appearance with custom branding, themes, 
                  and domain mapping for your brand identity.
                </p>
              </div>
              <div className="col col--4">
                <Heading as="h3">Integrations & Webhooks</Heading>
                <p>
                  Automate workflows with webhooks and native integrations 
                  for CRM, email marketing, and custom systems.
                </p>
              </div>
              <div className="col col--4">
                <Heading as="h3">Data Privacy</Heading>
                <p>
                  HIPAA, GDPR, and CCPA compliant with encryption, 
                  role-based access controls, and detailed audit trails.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Heading as="h2">Get Started</Heading>
            <p>
              Ready to build your form management platform? Choose your path below:
            </p>
            <div className={styles.buttons}>
              <Link
                className="button button--primary button--lg margin-right--md"
                to="/docs/developers"
              >
                Developer Quick Start
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="/docs/end-users"
              >
                End User Guide
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home(): React.ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Form Management Platform Documentation`}
      description="Complete documentation for Endatix Hub - build and manage form platforms with SurveyJS integration, custom question types, and enterprise features."
    >
      <HomepageHeader />
      <main>
        <HomepageContent />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
