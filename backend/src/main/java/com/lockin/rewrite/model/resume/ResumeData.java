package com.lockin.rewrite.model.resume;

import java.io.Serializable;
import java.util.List;

public class ResumeData implements Serializable {
    private PersonalInfo personalInfo;
    private List<Education> education;
    private Skills skills;
    private List<Experience> experience;
    private List<Project> projects;

    public ResumeData() {
    }

    public ResumeData(PersonalInfo personalInfo, List<Education> education, Skills skills, List<Experience> experience,
            List<Project> projects) {
        this.personalInfo = personalInfo;
        this.education = education;
        this.skills = skills;
        this.experience = experience;
        this.projects = projects;
    }

    public PersonalInfo getPersonalInfo() {
        return personalInfo;
    }

    public void setPersonalInfo(PersonalInfo personalInfo) {
        this.personalInfo = personalInfo;
    }

    public List<Education> getEducation() {
        return education;
    }

    public void setEducation(List<Education> education) {
        this.education = education;
    }

    public Skills getSkills() {
        return skills;
    }

    public void setSkills(Skills skills) {
        this.skills = skills;
    }

    public List<Experience> getExperience() {
        return experience;
    }

    public void setExperience(List<Experience> experience) {
        this.experience = experience;
    }

    public List<Project> getProjects() {
        return projects;
    }

    public void setProjects(List<Project> projects) {
        this.projects = projects;
    }

    // Inner Classes
    public static class PersonalInfo implements Serializable {
        private String name;
        private String phone;
        private String email;
        private String linkedin;
        private String portfolio;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getLinkedin() {
            return linkedin;
        }

        public void setLinkedin(String linkedin) {
            this.linkedin = linkedin;
        }

        public String getPortfolio() {
            return portfolio;
        }

        public void setPortfolio(String portfolio) {
            this.portfolio = portfolio;
        }
    }

    public static class Education implements Serializable {
        private String school;
        private String date;
        private String degree;
        private String gpa;

        public String getSchool() {
            return school;
        }

        public void setSchool(String school) {
            this.school = school;
        }

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public String getDegree() {
            return degree;
        }

        public void setDegree(String degree) {
            this.degree = degree;
        }

        public String getGpa() {
            return gpa;
        }

        public void setGpa(String gpa) {
            this.gpa = gpa;
        }
    }

    public static class Skills implements Serializable {
        private String languages;
        private String frameworks;
        private String tools;

        public String getLanguages() {
            return languages;
        }

        public void setLanguages(String languages) {
            this.languages = languages;
        }

        public String getFrameworks() {
            return frameworks;
        }

        public void setFrameworks(String frameworks) {
            this.frameworks = frameworks;
        }

        public String getTools() {
            return tools;
        }

        public void setTools(String tools) {
            this.tools = tools;
        }
    }

    public static class Experience implements Serializable {
        private String title;
        private String company;
        private String date;
        private String location;
        private String summary;
        private List<BulletPoint> bulletPoints;

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getCompany() {
            return company;
        }

        public void setCompany(String company) {
            this.company = company;
        }

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public String getLocation() {
            return location;
        }

        public void setLocation(String location) {
            this.location = location;
        }

        public String getSummary() {
            return summary;
        }

        public void setSummary(String summary) {
            this.summary = summary;
        }

        public List<BulletPoint> getBulletPoints() {
            return bulletPoints;
        }

        public void setBulletPoints(List<BulletPoint> bulletPoints) {
            this.bulletPoints = bulletPoints;
        }
    }

    public static class Project implements Serializable {
        private String title;
        private String link;
        private String date;
        private String summary;
        private String location;
        private List<BulletPoint> bulletPoints;

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getLink() {
            return link;
        }

        public void setLink(String link) {
            this.link = link;
        }

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public String getSummary() {
            return summary;
        }

        public void setSummary(String summary) {
            this.summary = summary;
        }

        public String getLocation() {
            return location;
        }

        public void setLocation(String location) {
            this.location = location;
        }

        public List<BulletPoint> getBulletPoints() {
            return bulletPoints;
        }

        public void setBulletPoints(List<BulletPoint> bulletPoints) {
            this.bulletPoints = bulletPoints;
        }
    }

    public static class BulletPoint implements Serializable {
        private String original;
        private String improved;
        private boolean accepted;

        public String getOriginal() {
            return original;
        }

        public void setOriginal(String original) {
            this.original = original;
        }

        public String getImproved() {
            return improved;
        }

        public void setImproved(String improved) {
            this.improved = improved;
        }

        public boolean isAccepted() {
            return accepted;
        }

        public void setAccepted(boolean accepted) {
            this.accepted = accepted;
        }
    }
}
