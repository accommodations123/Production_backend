pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "nextkinlife/prodnextkinlife"
        EB_ENV = "prod-backend-public"
        AWS_REGION = "us-east-2"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

      

       

        stage('Deploy to Elastic Beanstalk') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-creds']]) {

                    sh """
                        eb init nextkinlife_prod --region ${AWS_REGION} --platform docker
                        eb use ${EB_ENV}
                        eb deploy
                        eb status
                        eb health
                    """
                }
            }
        }
    }
}
