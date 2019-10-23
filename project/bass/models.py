from django.db import models


# class Game(models.Model):
#   """
#   Represents a Monster Hunter game, e.g., MHFU
#   """
#   name = models.CharField(
#     max_length=255,
#     blank=False,
#     null=False
#   )

#   resistances = models.ManyToManyField('Resistance')

#   has_decorations = models.BooleanField(
#     default=True
#   )


class Element(models.Model):
  name = models.CharField(
    max_length=255,
    blank=False,
    null=False
  )

  image = models.ImageField(
    null=False
  )

  def __str__(self):
    return self.name

  def __repr__(self):
    return '%s (%s)' % (self.name, self.__class__)


class WeaponClass(models.Model):
  """
  WeaponClass refers to class in game, i.e., Blademaster and Gunner
  """
  name = models.CharField(
    max_length=31,
    blank=False,
    null=False
  )

  def __str__(self):
    return self.name

class SkillTag(models.Model):
  """
  A SkillTag provides grouping for skills (e.g., Offensive, Farming, etc).
  """
  name = models.CharField(
    max_length=31,
    blank=False,
    null=False
  )


class SkillPoint(models.Model):
  name = models.CharField(
    max_length=31,
    blank=False,
    null=False
  )


class Skill(models.Model):
  name = models.CharField(
    max_length=31,
    blank=False,
    null=False
  )

  weapon_class = models.ForeignKey(
    WeaponClass,
    null=False,
    on_delete=models.CASCADE
  )

  tags = models.ManyToManyField(
    SkillTag,
    related_name='skills'
  )

  skill_point = models.ForeignKey(
    SkillPoint,
    null=False,
    related_name='skills',
    on_delete=models.CASCADE
  )

  points_required = models.IntegerField(
    blank=False,
    null=False
  )

  @property
  def is_good(self):
    """
    True if this is a good skill.
    Greater or equal to 0 for Torso Inc
    """
    return self.points_required >= 0

  @property
  def is_bad(self):
    return self.points_required < 0

class SkillBonus(models.Model):
  skill_point = models.ForeignKey(
    SkillPoint,
    null=False,
    on_delete=models.CASCADE
  )

  amount = models.IntegerField(
    null=False,
    blank=False
  )


class Item(models.Model):
  """
  Represents a generic item, could be a decoration, or a piece of armour
  """
  name = models.CharField(
    max_length=31,
    blank=False,
    null=False
  )

  rarity = models.IntegerField(
    blank=False,
    null=False
  )


class Decoration(Item):
  slots = models.IntegerField(
    null=False,
    blank=False
  )

  bonus = models.ForeignKey(
    SkillBonus,
    null=False,
    related_name='decorations',
    on_delete=models.CASCADE
  )

  penalty = models.ForeignKey(
    SkillBonus,
    null=True,
    on_delete=models.CASCADE
  )


class Resistance(models.Model):
  element = models.ForeignKey(
    Element,
    null=False,
    blank=False,
    on_delete=models.CASCADE
  )

  amount = models.IntegerField(
    null=False,
    blank=False
  )

class Armour(models.Model):
  GENDER_BOTH = 0
  GENDER_MALE = 1
  GENDER_FEMALE = 2
  GENDER_OPTIONS = (
    (GENDER_BOTH, 'Both'),
    (GENDER_MALE, 'Male'),
    (GENDER_FEMALE, 'Female')
  )
  gender = models.IntegerField(
    choices=GENDER_OPTIONS,
    null=False,
    blank=False
  )

  weapon_class = models.ForeignKey(
    WeaponClass,
    null=False,
    blank=False,
    on_delete=models.CASCADE
  )

  PART_HEAD = 0
  PART_TORSO = 1
  PART_ARMS = 2
  PART_WAIST = 3
  PART_LEGS = 4
  PART_OPTIONS = (
    (PART_HEAD, 'Head'),
    (PART_TORSO, 'Torso'),
    (PART_ARMS, 'Arms'),
    (PART_WAIST, 'Waist'),
    (PART_LEGS, 'Legs'),
  )
  part = models.IntegerField(
    choices=PART_OPTIONS,
    null=False,
    blank=False
  )

  defence = models.IntegerField(
    null=False,
    blank=False
  )

  resistances = models.ManyToManyField(Resistance)

  slots = models.IntegerField(
    null=False,
    blank=False
  )

  points = models.ManyToManyField(SkillBonus)
