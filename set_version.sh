#!/usr/bin/env bash
# Script to change all the hardcoded version number for the repo.
# Currently works only for themes and python apps

VERSION=$1

THEME_VERSION_FILE="settings_schema.json"
THEME_VERSION_FIELD="theme_version"
PYTHON_VERSION_FILE="__version__.py"
PYTHON_VERSION_FIELD="__version__"

# Change the version in the settings file of the theme
for theme_settings in `find . -name $THEME_VERSION_FILE`
do
  sed -i "s/\(.*$THEME_VERSION_FIELD\).*/\1\": \"$VERSION\",/" $theme_settings
done

# Change the version in two files for python apps
for python_version in `find . -name $PYTHON_VERSION_FILE`
do
  sed -i "s/$PYTHON_VERSION_FIELD *=.*/$PYTHON_VERSION_FIELD = '$VERSION'/" $python_version
done

for python_pyproject in `find . -name pyproject.toml`
do
  sed -i "s/^version *=.*/version = \"$VERSION\"/" $python_pyproject
done
