pipeline {
    agent any
 
    environment {
        DOCKER_IMAGE = "nextkinlife/prodnextkinlife"
        EB_ENV = "prod-backend-final"
    }
 
    stages {
 
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
 
        stage('Build Docker Image') {
            steps {
                script {
                    docker.build("${DOCKER_IMAGE}:latest")
                }
            }
        }
 
        stage('Push to DockerHub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                                                 usernameVariable: 'USER',
                                                 passwordVariable: 'PASS')]) {
                    sh """
                        echo $PASS | docker login -u $USER --password-stdin
                        docker push ${DOCKER_IMAGE}:latest
                    """
                }
            }
        }
 
        stage('Deploy to Elastic Beanstalk') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-creds']]) {
 
                    sh """
                        eb use ${EB_ENV}
                        eb deploy
                        eb status
                    """
                }
            }
        }
    }
}