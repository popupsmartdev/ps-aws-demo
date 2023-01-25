#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DemoStack } from '../lib/demo-stack';
import {DataStack} from "../lib/data-stack";

const app = new cdk.App();
new DemoStack(app, 'PsAwsDemoStack');
new DataStack(app, 'PsAwsDataStack');